"""Orquestador de RITCHIE: de una pregunta a una respuesta defendible.

El recorrido completo, en orden y sin atajos:

datos verificables → calidad → variables sin fuga → objetivo exacto →
validación temporal → competencia de modelos → calibración → prueba final
intacta → escenarios Monte Carlo → descubrimiento de patrones → backtest con
costos → confianza → ¿hay señal? → explicación en lenguaje simple → auditoría.

Si algo de eso falla, la respuesta lo dice. Nunca se rellena con suposiciones.
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable

import numpy as np
import pandas as pd

from .audit import run_audit
from .backtest import run_backtest
from .config import (
    DEFAULT_HISTORY_DAYS,
    ENGINE_NAME,
    ENGINE_VERSION,
    RitchieConfig,
    cache_dir,
    config_for_profile,
    paths_for_evaluation,
)
from .data import DataUnavailable, MarketDataLoader
from .data.sources import DEFAULT_SOURCE_ORDER
from .decision import assess_confidence, build_narrative, evaluate_signal, regime_novelty
from .features import TargetSpec, align_xy, build_features, build_target
from .features.targets import realized_summary
from .models import build_candidates, disagreement
from .models.base import SeriesContext
from .models.bayes import BayesianAnalogModel
from .models.garch import GarchModel
from .models.timeseries import MarkovRegimeModel
from .nlq import ParsedQuestion, parse
from .research import discover
from .simulation import run_scenarios
from .validation import run_walk_forward, select_model
from .validation.selection import add_ensembles

#: Columnas mínimas para que valga la pena modelar con variables.
MIN_FEATURE_COLUMNS = 15


@dataclass
class AnalysisResult:
    """Todo lo que RITCHIE puede decir sobre una pregunta, en un solo objeto."""

    ok: bool
    symbol: str
    question: str
    payload: dict = field(default_factory=dict)
    error: str | None = None

    def to_dict(self) -> dict:
        data = dict(self.payload)
        data["ok"] = self.ok
        if self.error:
            data["error"] = self.error
        return data


def _progress(callback: Callable[[str, float], None] | None, stage: str, value: float) -> None:
    if callback is not None:
        try:
            callback(stage, value)
        except Exception:  # noqa: BLE001 - el progreso nunca rompe el análisis
            pass


class Ritchie:
    """Punto de entrada único del sistema."""

    def __init__(
        self,
        config: RitchieConfig | None = None,
        loader: MarketDataLoader | None = None,
        allow_synthetic: bool = False,
        use_result_cache: bool = True,
        source_order: tuple[str, ...] = DEFAULT_SOURCE_ORDER,
    ):
        self.config = config or config_for_profile("completo")
        self.allow_synthetic = allow_synthetic
        self.loader = loader or MarketDataLoader(
            source_order=source_order, allow_synthetic=allow_synthetic
        )
        self.use_result_cache = use_result_cache
        # Modo demostración: el usuario pidió explícitamente una fuente
        # simulada. Distinto —y mucho menos peligroso— que caer en datos
        # simulados porque las fuentes reales fallaron.
        self.demo_mode = bool(source_order) and all(
            str(name).startswith("synthetic") for name in source_order
        )

    # ------------------------------------------------------------------ API
    def ask(
        self,
        question: str,
        default_symbol: str | None = None,
        progress: Callable[[str, float], None] | None = None,
    ) -> AnalysisResult:
        """Responde una pregunta escrita en español."""
        parsed = parse(question, default_symbol=default_symbol)
        if parsed.symbol is None:
            return AnalysisResult(
                ok=False,
                symbol="",
                question=question,
                error="no_symbol",
                payload={
                    "pregunta": parsed.to_dict(),
                    "mensaje": "No identifiqué el activo. Escribe su símbolo, por ejemplo MARA o AAPL.",
                    "aclaraciones": parsed.clarifications,
                },
            )
        result = self.analyze(parsed.symbol, parsed.spec, progress=progress, parsed=parsed)
        return result

    def analyze(
        self,
        symbol: str,
        spec: TargetSpec,
        progress: Callable[[str, float], None] | None = None,
        parsed: ParsedQuestion | None = None,
        history_days: int = DEFAULT_HISTORY_DAYS,
    ) -> AnalysisResult:
        """Análisis completo para un activo y un objetivo concretos."""
        started = time.time()
        _progress(progress, "Buscando datos verificables", 0.05)

        try:
            loaded = self.loader.load(symbol, days=history_days)
        except DataUnavailable as exc:
            return AnalysisResult(
                ok=False,
                symbol=symbol,
                question=parsed.raw if parsed else "",
                error="data_unavailable",
                payload={
                    "mensaje": (
                        f"No pude conseguir datos verificables de «{symbol}». "
                        "RITCHIE no inventa una serie para poder responder."
                    ),
                    "motivos": exc.reasons,
                    "simbolo": symbol,
                },
            )

        market = loaded.primary
        cache_key = self._cache_key(market, spec)
        cached = self._read_result_cache(cache_key)
        if cached is not None:
            cached["desde_cache"] = True
            return AnalysisResult(ok=True, symbol=market.symbol, question=cached.get("pregunta_texto", ""), payload=cached)

        _progress(progress, "Construyendo variables sin mirar al futuro", 0.15)
        feature_matrix = build_features(market, loaded.companions)
        features, prediction_date, staleness = self._prepare_features(feature_matrix.frame)

        target = build_target(market, spec)
        x, y, _ = align_xy(features, target)
        base_summary = realized_summary(market, spec)

        ctx = SeriesContext(
            market=market,
            spec=spec,
            seed=self.config.seed,
            n_paths=paths_for_evaluation(self.config.profile),
        )

        if len(x) < self.config.decision.min_observations // 2 or len(features.columns) < MIN_FEATURE_COLUMNS:
            return self._insufficient_data_result(
                market, spec, parsed, loaded, feature_matrix, x, base_summary, ctx, started
            )

        _progress(progress, "Validando modelos contra el pasado, día por día", 0.25)
        models = build_candidates(self.config.profile)
        families = {m.name: m.family for m in models}
        purposes = {m.name: m.purpose for m in models}

        try:
            walk = run_walk_forward(
                models,
                x,
                y,
                ctx,
                self.config.validation,
                progress=lambda i, n: _progress(
                    progress, f"Validando bloque {i} de {n}", 0.25 + 0.40 * i / max(n, 1)
                ),
            )
        except ValueError as exc:
            return self._insufficient_data_result(
                market, spec, parsed, loaded, feature_matrix, x, base_summary, ctx, started, str(exc)
            )

        _progress(progress, "Comparando modelos y corrigiendo por pruebas múltiples", 0.68)
        selection = select_model(
            walk.predictions,
            walk.y,
            walk.dev_mask,
            families,
            purposes,
            self.config.decision,
            seed=self.config.seed,
            horizon=spec.horizon,
        )

        _progress(progress, "Calculando la probabilidad de hoy", 0.76)
        live = self._live_predictions(walk, ctx, features, prediction_date, families)
        probability_raw = live["probabilities"].get(selection.selected) if selection.selected else None
        probability = (
            float(selection.calibrator.transform(np.array([probability_raw]))[0])
            if probability_raw is not None
            else None
        )

        _progress(progress, "Simulando miles de escenarios", 0.82)
        scenario = self._scenarios(market, spec, walk, ctx)

        _progress(progress, "Buscando patrones históricos", 0.88)
        hypotheses = discover(
            features, y, walk.dev_end, today_row=live["today"], alpha=0.10
        )

        _progress(progress, "Probando la estrategia con costos reales", 0.91)
        backtest = self._backtest(market, selection, walk, spec)

        _progress(progress, "Midiendo confianza y verificando si hay señal", 0.94)
        analog = live["analog"]
        novelty = regime_novelty(x, live["today"])
        model_spread = live["spread"]
        test_metrics = selection.test_metrics
        confidence = assess_confidence(
            model_selected=selection.selected is not None,
            calibration_ece=(
                selection.dev_metrics_calibrated.ece if selection.dev_metrics_calibrated else None
            ),
            calibration_slope=(
                selection.dev_metrics_calibrated.calibration_slope
                if selection.dev_metrics_calibrated
                else None
            ),
            n_oos=int(len(walk.predictions)),
            n_events=int(walk.y.sum()),
            analog_evidence=analog,
            model_spread=model_spread,
            novelty_percentile=novelty.get("percentil"),
            data_quality=market.quality.score if market.quality else 0.0,
            test_brier_skill=test_metrics.brier_skill if test_metrics else None,
            decision=self.config.decision,
        )

        signal = evaluate_signal(
            n_observations=int(len(x)),
            n_oos=int(len(walk.predictions)),
            n_events=int(walk.y.sum()),
            selected_model=selection.selected,
            rejection_reasons=selection.rejection_reasons,
            calibration_ece=(
                selection.dev_metrics_calibrated.ece if selection.dev_metrics_calibrated else None
            ),
            model_spread=model_spread,
            novelty_percentile=novelty.get("percentil"),
            data_quality=market.quality.score if market.quality else 0.0,
            data_issues=market.quality.issues if market.quality else [],
            probability=probability,
            base_rate=base_summary.get("base_rate"),
            is_synthetic=market.is_synthetic and not self.demo_mode,
            decision=self.config.decision,
        )

        _progress(progress, "Auditando el análisis", 0.97)
        audit = run_audit(
            market=market,
            features=features,
            target=target,
            x=x,
            y=y,
            walk=walk,
            selection=selection,
            spec=spec,
            ctx=ctx,
            companions=loaded.companions,
        )

        # Auditoría con poder de veto: una falla crítica bloquea la señal.
        if not audit["aprobada"]:
            from .decision.no_signal import Blocker

            for failure in audit["fallas_criticas"]:
                signal.blockers.append(
                    Blocker(
                        key=f"auditoria_{failure['clave']}",
                        reason=f"La auditoría automática falló: {failure['prueba']}",
                        detail=failure["detalle"],
                        remedy="No se emite ninguna probabilidad hasta que la verificación pase.",
                    )
                )
            signal.has_signal = False
            signal.message = "No hay suficiente evidencia para generar una señal confiable."
            probability = None

        narrative = build_narrative(
            symbol=market.symbol,
            target_description=spec.describe(),
            probability=probability if signal.has_signal else None,
            base_rate=base_summary.get("base_rate"),
            opposite_probability=scenario.get("probabilidad_contraria") if scenario else None,
            confidence_label=confidence.label,
            has_signal=signal.has_signal,
            blockers=[b.to_dict() for b in signal.blockers],
            contributions=live["contributions"],
            today=live["today"],
            descriptions=feature_matrix.descriptions,
            analog_evidence=analog,
            scenario=scenario,
            horizon_text=self._horizon_text(spec.horizon),
            is_synthetic=market.is_synthetic,
        )

        if market.is_synthetic:
            narrative.headline = "SIMULACIÓN · " + narrative.headline

        payload = self._assemble(
            market=market,
            loaded=loaded,
            spec=spec,
            parsed=parsed,
            feature_matrix=feature_matrix,
            x=x,
            y=y,
            walk=walk,
            selection=selection,
            live=live,
            probability=probability,
            probability_raw=probability_raw,
            base_summary=base_summary,
            scenario=scenario,
            hypotheses=hypotheses,
            backtest=backtest,
            confidence=confidence,
            signal=signal,
            narrative=narrative,
            novelty=novelty,
            audit=audit,
            prediction_date=prediction_date,
            staleness=staleness,
            elapsed=time.time() - started,
        )
        self._write_result_cache(cache_key, payload)
        _progress(progress, "Listo", 1.0)
        return AnalysisResult(
            ok=True, symbol=market.symbol, question=parsed.raw if parsed else "", payload=payload
        )

    # -------------------------------------------------------------- internos
    @staticmethod
    def _horizon_text(horizon: int) -> str:
        if horizon == 1:
            return "la próxima sesión"
        if horizon == 5:
            return "la próxima semana"
        if horizon == 20:
            return "el próximo mes"
        return f"las próximas {horizon} sesiones"

    def _prepare_features(
        self, frame: pd.DataFrame
    ) -> tuple[pd.DataFrame, pd.Timestamp, dict]:
        """Deja las columnas que existen HOY, para no predecir con datos viejos."""
        last = frame.index[-1]
        usable = [c for c in frame.columns if pd.notna(frame.loc[last, c])]
        staleness: dict = {"columnas_descartadas_por_faltar_hoy": []}
        if len(usable) >= MIN_FEATURE_COLUMNS:
            dropped = sorted(set(frame.columns) - set(usable))
            staleness["columnas_descartadas_por_faltar_hoy"] = dropped
            return frame[usable], last, staleness

        complete = frame.dropna()
        if complete.empty:
            return frame, last, {"error": "ninguna fila tiene todas las variables"}
        staleness["aviso"] = (
            "La última sesión no trae todas las variables; se usó la última fila completa."
        )
        return frame, complete.index[-1], staleness

    def _live_predictions(
        self,
        walk,
        ctx: SeriesContext,
        features: pd.DataFrame,
        prediction_date: pd.Timestamp,
        families: dict[str, str],
    ) -> dict:
        """Probabilidad de HOY según cada modelo ya ajustado con toda la historia."""
        today_frame = features.loc[[prediction_date]]
        today = today_frame.iloc[0]
        probabilities: dict[str, float] = {}
        contributions = []
        analog: dict = {}

        for name, model in walk.fitted_models.items():
            try:
                value = float(model.predict_proba(today_frame, ctx)[0])
                probabilities[name] = value
            except Exception:  # noqa: BLE001 - un modelo caído no borra el resto
                continue

        enriched, ensembles = add_ensembles(
            pd.DataFrame([probabilities], index=[prediction_date]), families
        )
        for column in enriched.columns:
            probabilities[column] = float(enriched[column].iloc[0])

        # Cada modelo mide el efecto en su propia escala (log-odds en la
        # logística, diferencia de probabilidad en los árboles). Mezclarlos
        # crudos ordenaría mal los factores, así que cada lista se normaliza
        # a su propio máximo antes de juntarlas: el orden pasa a significar
        # "qué tanto pesó dentro de su modelo".
        for name in ("logistica", "gradient_boosting", "random_forest", "bayesiano_analogos"):
            model = walk.fitted_models.get(name)
            if model is None:
                continue
            try:
                own = model.explain(today, ctx)
            except Exception:  # noqa: BLE001
                continue
            if not own:
                continue
            largest = max(abs(c.effect) for c in own) or 1.0
            for contribution in own:
                contribution.effect = float(contribution.effect) / largest
            contributions.extend(own)

        bayes = walk.fitted_models.get("bayesiano_analogos")
        if isinstance(bayes, BayesianAnalogModel):
            try:
                analog = bayes.analog_evidence(today, ctx)
            except Exception:  # noqa: BLE001
                analog = {}

        non_baseline = [n for n, f in families.items() if f not in ("baseline",) and n in probabilities]
        spread = (
            float(np.std([probabilities[n] for n in non_baseline])) if len(non_baseline) >= 2 else None
        )
        contributions.sort(key=lambda c: abs(c.effect), reverse=True)

        return {
            "probabilities": probabilities,
            "today": today,
            "today_frame": today_frame,
            "contributions": contributions,
            "analog": analog,
            "spread": spread,
            "date": prediction_date,
        }

    def _scenarios(self, market, spec: TargetSpec, walk, ctx: SeriesContext) -> dict:
        garch = walk.fitted_models.get("garch")
        regime = walk.fitted_models.get("markov_regimenes")
        scenario_ctx = SeriesContext(
            market=market, spec=spec, seed=self.config.seed, n_paths=self.config.simulation.n_paths
        )
        try:
            report = run_scenarios(
                market,
                spec,
                scenario_ctx,
                n_paths=self.config.simulation.n_paths,
                garch=garch if isinstance(garch, GarchModel) else None,
                regime=regime if isinstance(regime, MarkovRegimeModel) else None,
                block=self.config.simulation.block_size,
            )
        except Exception as exc:  # noqa: BLE001 - los escenarios son opcionales
            return {"error": str(exc)}

        data = report.to_dict()
        opposite = TargetSpec(
            horizon=spec.horizon,
            threshold=spec.threshold,
            direction={"up": "down", "down": "up", "range": "range"}[spec.direction],
            mode=spec.mode,
        )
        if spec.direction == "range":
            data["probabilidad_contraria"] = (
                1 - data["probabilidad_objetivo"] if data.get("probabilidad_objetivo") is not None else None
            )
            data["objetivo_contrario"] = "que se salga de ese rango"
        else:
            try:
                opposite_ctx = SeriesContext(
                    market=market, spec=opposite, seed=self.config.seed,
                    n_paths=self.config.simulation.n_paths,
                )
                opposite_report = run_scenarios(
                    market,
                    opposite,
                    opposite_ctx,
                    n_paths=self.config.simulation.n_paths,
                    garch=garch if isinstance(garch, GarchModel) else None,
                    regime=regime if isinstance(regime, MarkovRegimeModel) else None,
                    block=self.config.simulation.block_size,
                )
                data["probabilidad_contraria"] = opposite_report.probability_target
                data["objetivo_contrario"] = opposite.describe()
            except Exception:  # noqa: BLE001
                data["probabilidad_contraria"] = None
        return data

    def _backtest(self, market, selection, walk, spec: TargetSpec) -> dict:
        name = selection.selected
        if name is None:
            candidates = [
                s.name for s in selection.ranking if not s.is_baseline and s.dev.n > 100
            ]
            name = candidates[0] if candidates else None
        if name is None or selection.predictions is None or name not in selection.predictions:
            return {"disponible": False, "motivo": "No hay un modelo con predicciones suficientes."}
        series = selection.predictions[name].dropna()
        try:
            calibrated = pd.Series(
                selection.calibrator.transform(series.to_numpy()), index=series.index
            )
            report = run_backtest(
                market,
                calibrated,
                spec.horizon,
                self.config.backtest,
                seed=self.config.seed,
            )
            data = report.to_dict()
            data["disponible"] = True
            data["modelo"] = name
            data["advertencia"] = (
                "Este backtest usa únicamente predicciones fuera de muestra. Aun así, un "
                "resultado histórico no garantiza nada hacia adelante."
            )
            return data
        except Exception as exc:  # noqa: BLE001
            return {"disponible": False, "motivo": str(exc)}

    def _insufficient_data_result(
        self, market, spec, parsed, loaded, feature_matrix, x, base_summary, ctx, started, detail: str = ""
    ) -> AnalysisResult:
        """Cuando no alcanza para modelar, se dice y se entrega lo que sí es sólido."""
        scenario = {}
        try:
            scenario_ctx = SeriesContext(
                market=market, spec=spec, seed=self.config.seed,
                n_paths=self.config.simulation.n_paths,
            )
            scenario = run_scenarios(
                market, spec, scenario_ctx, n_paths=self.config.simulation.n_paths
            ).to_dict()
        except Exception:  # noqa: BLE001
            scenario = {}

        signal = evaluate_signal(
            n_observations=int(len(x)),
            n_oos=0,
            n_events=int(base_summary.get("events", 0) or 0),
            selected_model=None,
            rejection_reasons=[detail] if detail else [],
            calibration_ece=None,
            model_spread=None,
            novelty_percentile=None,
            data_quality=market.quality.score if market.quality else 0.0,
            data_issues=market.quality.issues if market.quality else [],
            probability=None,
            base_rate=base_summary.get("base_rate"),
            is_synthetic=market.is_synthetic and not self.demo_mode,
            decision=self.config.decision,
        )
        narrative = build_narrative(
            symbol=market.symbol,
            target_description=spec.describe(),
            probability=None,
            base_rate=base_summary.get("base_rate"),
            opposite_probability=None,
            confidence_label="muy baja",
            has_signal=False,
            blockers=[b.to_dict() for b in signal.blockers],
            contributions=[],
            today=x.iloc[-1] if len(x) else pd.Series(dtype=float),
            descriptions=feature_matrix.descriptions,
            analog_evidence=None,
            scenario=scenario or None,
            horizon_text=self._horizon_text(spec.horizon),
            is_synthetic=market.is_synthetic,
        )
        payload = {
            "motor": self._engine_block(),
            "pregunta": parsed.to_dict() if parsed else None,
            "pregunta_texto": parsed.raw if parsed else "",
            "activo": self._asset_block(market, loaded),
            "objetivo": spec.to_dict(),
            "simulacion": {
                "activa": bool(market.is_synthetic),
                "modo_demostracion": bool(self.demo_mode),
                "aviso": (
                    "Esta corrida usa una serie SIMULADA. No corresponde a ningún mercado real."
                    if market.is_synthetic
                    else ""
                ),
                "notas": list(market.notes),
            },
            "resumen": {
                "probabilidad": None,
                "probabilidad_contraria": scenario.get("probabilidad_contraria") if scenario else None,
                "tasa_base_historica": base_summary.get("base_rate"),
                "confianza": {"nivel": "muy_baja", "nivel_texto": "muy baja", "puntaje": 0.0, "factores": []},
                "hay_senal": False,
                **narrative.to_dict(),
            },
            "senal": signal.to_dict(),
            "escenarios": scenario,
            "historia_del_objetivo": base_summary,
            "procedencia": loaded.provenance(),
            "segundos": round(time.time() - started, 2),
        }
        return AnalysisResult(
            ok=True, symbol=market.symbol, question=parsed.raw if parsed else "", payload=payload
        )

    # ------------------------------------------------------------- ensamblado
    def _engine_block(self) -> dict:
        return {
            "nombre": ENGINE_NAME,
            "version": ENGINE_VERSION,
            "perfil": self.config.profile,
            "semilla": self.config.seed,
        }

    @staticmethod
    def _asset_block(market, loaded) -> dict:
        return {
            "simbolo": market.symbol,
            "nombre": market.long_name,
            "tipo": market.asset_class,
            "moneda": market.currency,
            "mercado": market.exchange,
            "precio_actual": round(market.last_price, 4),
            "fecha_ultimo_dato": market.last_date.strftime("%Y-%m-%d"),
            "es_simulado": market.is_synthetic,
            "fuente": market.source,
            "contexto_disponible": list(loaded.companions),
            "contexto_faltante": loaded.missing_companions,
        }

    def _assemble(self, **kw) -> dict:
        market = kw["market"]
        spec: TargetSpec = kw["spec"]
        walk = kw["walk"]
        selection = kw["selection"]
        live = kw["live"]
        confidence = kw["confidence"]
        signal = kw["signal"]
        narrative = kw["narrative"]
        scenario = kw["scenario"]
        probability = kw["probability"]

        close = market.frame["raw_close"] if "raw_close" in market.frame else market.frame["close"]
        recent = close.iloc[-180:]
        price_history = [
            {"fecha": d.strftime("%Y-%m-%d"), "precio": round(float(v), 4)}
            for d, v in recent.items()
        ]

        model_probabilities = {
            name: round(float(value), 5) for name, value in sorted(live["probabilities"].items())
        }

        useful_patterns = [h.to_dict() for h in kw["hypotheses"] if h.useful]
        active_patterns = [h.to_dict() for h in kw["hypotheses"] if h.active_today]

        payload = {
            "motor": self._engine_block(),
            "pregunta": kw["parsed"].to_dict() if kw["parsed"] else None,
            "pregunta_texto": kw["parsed"].raw if kw["parsed"] else "",
            "interpretacion": kw["parsed"].restated() if kw["parsed"] else "",
            "activo": self._asset_block(market, kw["loaded"]),
            "objetivo": spec.to_dict(),
            "simulacion": {
                "activa": bool(market.is_synthetic),
                "modo_demostracion": bool(self.demo_mode),
                "aviso": (
                    "Esta corrida usa una serie SIMULADA. No corresponde a ningún mercado real "
                    "y no sirve para decidir nada con dinero."
                    if market.is_synthetic
                    else ""
                ),
                "notas": list(market.notes),
            },
            "resumen": {
                "probabilidad": round(probability, 4) if probability is not None else None,
                "probabilidad_sin_calibrar": (
                    round(kw["probability_raw"], 4) if kw["probability_raw"] is not None else None
                ),
                "probabilidad_contraria": scenario.get("probabilidad_contraria") if scenario else None,
                "objetivo_contrario": scenario.get("objetivo_contrario") if scenario else None,
                "tasa_base_historica": kw["base_summary"].get("base_rate"),
                "modelo_elegido": selection.selected,
                "confianza": confidence.to_dict(),
                "hay_senal": signal.has_signal,
                "fecha_prediccion": kw["prediction_date"].strftime("%Y-%m-%d"),
                **narrative.to_dict(),
            },
            "senal": signal.to_dict(),
            "grafica_precio": price_history,
            "escenarios": scenario,
            "nivel_2_factores": {
                "factores": narrative.factors,
                "probabilidad_por_modelo": model_probabilities,
                "desacuerdo_entre_modelos": (
                    round(live["spread"], 5) if live["spread"] is not None else None
                ),
                "evidencia_historica": live["analog"],
                "estado_actual": kw["novelty"],
                "patrones_activos_hoy": active_patterns,
            },
            "nivel_3_estadisticas": {
                "historia_del_objetivo": kw["base_summary"],
                "validacion": walk.protocol(),
                "metricas_prueba_final": (
                    selection.test_metrics.to_dict() if selection.test_metrics else None
                ),
                "metricas_desarrollo_calibradas": (
                    selection.dev_metrics_calibrated.to_dict()
                    if selection.dev_metrics_calibrated
                    else None
                ),
                "backtest": kw["backtest"],
                "patrones_descubiertos": [h.to_dict() for h in kw["hypotheses"]],
                "patrones_utiles": useful_patterns,
            },
            "nivel_4_metodologia": {
                "protocolo": [
                    "Datos con fuente y fecha registradas; nunca se rellenan huecos.",
                    "Variables construidas solo con información anterior a la predicción.",
                    "Validación temporal hacia adelante con purga del horizonte.",
                    "Competencia entre modelos medida por calidad de probabilidad.",
                    "Corrección por pruebas múltiples antes de aceptar cualquier ventaja.",
                    "Calibración aprendida solo con datos anteriores al periodo evaluado.",
                    "Tramo final de prueba jamás usado para elegir nada.",
                    "Escenarios Monte Carlo con tres mecanismos distintos.",
                    "Backtest con comisiones, deslizamiento y entradas realistas.",
                ],
                "modelos_evaluados": [s.to_dict() for s in selection.ranking],
                "prueba_de_realidad": selection.reality,
                "calibracion": selection.calibration_report,
                "motivos_de_rechazo": selection.rejection_reasons,
                "variables": {
                    "total": len(kw["x"].columns),
                    "por_familia": self._feature_families(kw["feature_matrix"], kw["x"]),
                    "descartadas": kw["feature_matrix"].skipped,
                    "sin_dato_hoy": kw["staleness"].get("columnas_descartadas_por_faltar_hoy", []),
                },
            },
            "nivel_5_tecnico": {
                "auditoria": kw["audit"],
                "bloques_de_validacion": [f.__dict__ for f in walk.folds[-8:]],
                "diagnosticos_de_modelos": walk.model_info,
                "procedencia": kw["loaded"].provenance(),
                "reproducibilidad": self._reproducibility(market, spec, kw["x"]),
                "advertencias": walk.warnings,
            },
            "limitaciones": self._limitations(market, spec, walk),
            "segundos": round(kw["elapsed"], 2),
        }
        return payload

    @staticmethod
    def _feature_families(feature_matrix, x: pd.DataFrame) -> dict:
        counts: dict[str, int] = {}
        for column in x.columns:
            family = feature_matrix.family_of(column)
            counts[family] = counts.get(family, 0) + 1
        return counts

    def _reproducibility(self, market, spec: TargetSpec, x: pd.DataFrame) -> dict:
        return {
            "version_motor": ENGINE_VERSION,
            "semilla": self.config.seed,
            "perfil": self.config.profile,
            "configuracion": self.config.to_dict(),
            "fuente_datos": market.source,
            "url_fuente": market.source_url,
            "datos_obtenidos_en": market.retrieved_at.astimezone(timezone.utc).isoformat(),
            "huella_datos": self._data_fingerprint(market),
            "objetivo": spec.key,
            "filas_entrenamiento": int(len(x)),
            "momento_del_analisis": datetime.now(timezone.utc).isoformat(),
        }

    @staticmethod
    def _data_fingerprint(market) -> str:
        frame = market.frame
        payload = f"{market.symbol}|{len(frame)}|{frame.index[0]}|{frame.index[-1]}|{frame['close'].sum():.6f}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]

    @staticmethod
    def _limitations(market, spec: TargetSpec, walk) -> list[str]:
        limits = [
            "El modelo solo ve precio, volumen y contexto de mercado. No lee noticias, "
            "reportes trimestrales, demandas ni decisiones regulatorias.",
            "Toda la evidencia es histórica: si el activo cambia de naturaleza, el pasado "
            "deja de ser una guía.",
            "Las probabilidades describen frecuencias, no certezas: un 80% falla una de cada cinco veces.",
            f"El horizonte analizado es de {spec.horizon} "
            f"{'sesión' if spec.horizon == 1 else 'sesiones'}; fuera de él no hay conclusión válida.",
        ]
        if market.quality and market.quality.issues:
            limits.append("Problemas detectados en los datos: " + " ".join(market.quality.issues[:2]))
        if market.is_synthetic:
            limits.insert(0, "DATOS SIMULADOS: esta corrida no describe ningún activo real.")
        if walk.warnings:
            limits.append("Incidencias durante la validación: " + " | ".join(walk.warnings[:2]))
        return limits

    # ----------------------------------------------------------------- caché
    def _cache_key(self, market, spec: TargetSpec) -> str:
        raw = "|".join(
            [
                ENGINE_VERSION,
                self.config.profile,
                str(self.config.seed),
                market.symbol,
                market.source,
                market.frame.index[-1].strftime("%Y-%m-%d"),
                str(len(market.frame)),
                spec.key,
            ]
        )
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]

    def _cache_path(self, key: str) -> str:
        folder = os.path.join(cache_dir(), "analisis")
        os.makedirs(folder, exist_ok=True)
        return os.path.join(folder, f"{key}.json")

    def _read_result_cache(self, key: str) -> dict | None:
        if not self.use_result_cache:
            return None
        path = self._cache_path(key)
        if not os.path.isfile(path):
            return None
        try:
            with open(path, encoding="utf-8") as handle:
                return json.load(handle)
        except Exception:  # noqa: BLE001
            return None

    def _write_result_cache(self, key: str, payload: dict) -> None:
        if not self.use_result_cache:
            return
        try:
            with open(self._cache_path(key), "w", encoding="utf-8") as handle:
                json.dump(payload, handle, ensure_ascii=False, default=str)
        except Exception:  # noqa: BLE001
            pass
