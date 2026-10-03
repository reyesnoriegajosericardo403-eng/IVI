// Fechas dentro de una captura completa (parseCaptureText): el monto, el tipo y la categoría deben salir bien aunque la
// frase traiga números de fecha/hora, y el movimiento debe quedar en el día que la persona dijo.
// Etiquetas escritas a mano (hoy = SÁBADO 2026-10-03). expect: { amount, type?, subcategoryId?, date: 'AAAA-MM-DD'|null, futureDate? }
//   date = día PASADO dicho (hoy / sin fecha = null).   futureDate = día futuro dicho (aún no se usa como fecha del movimiento).
// subcategoryId null = no se evalúa la categoría (solo monto y fecha)
const E = (amount, subcategoryId, date = null, extra = {}) => ({ amount, ...(subcategoryId ? { subcategoryId } : {}), date, ...extra });
module.exports = [
  // el número de la fecha NO es el monto (la fecha trae un número mayor que el precio)
  ['el 20 de octubre pagué 15 de estacionamiento', E(15, 'trans_parking', '2025-10-20')],
  ['el 28 de septiembre compré un café 25', E(25, 'food_coffee', '2026-09-28')],
  ['el 30 de septiembre 20 pesos de café', E(20, 'food_coffee', '2026-09-30')],
  ['pagué 8 pesos de camión el lunes', E(8, 'trans_public', '2026-09-28')],
  ['el 20 pagué la luz 560', E(560, 'house_electricity', '2026-09-20')],
  ['el 28 de septiembre 4998 de la renta del depa', E(4998, 'house_rent', '2026-09-28')],
  ['el 3 de oct 2500 de renta', E(2500, 'house_rent', null)],
  ['15 de marzo de 2025 pagué 2040 del predial', E(2040, 'tax_property', '2025-03-15')],
  // la hora tampoco es dinero
  ['paleta a las 16 hrs 12', E(12, 'food_sweets')],
  ['a las 3 de la tarde café 45', E(45, 'food_coffee')],
  ['a las 8 de la noche pedí comida 350', E(350, null)],
  ['pagué ayer a las 3 de la tarde 450 de luz', E(450, 'house_electricity', '2026-10-02')],
  // el día dicho queda como fecha del movimiento
  ['hace 3 días compré tacos 120', E(120, 'food_fastfood', '2026-09-30')],
  ['ayer cené 500 en el restaurante', E(500, 'food_restaurant', '2026-10-02')],
  ['el viernes pagué el internet 599', E(599, 'house_internet', '2026-10-02')],
  ['antier gasolina 800', E(800, 'trans_gas', '2026-10-01')],
  ['el 15 de marzo pagué el predial 2040', E(2040, 'tax_property', '2026-03-15')],
  ['pagué 3500 de colegiatura el día 5', E(3500, 'edu_tuition', '2026-09-05')],
  ['la semana pasada compré unos tenis 1700', E(1700, 'misc_clothing', '2026-09-26')],
  ['hace dos semanas el dentista 900', E(900, 'health_dentist', '2026-09-19')],
  ['el 31 de diciembre cena 1500', E(1500, 'food_restaurant', '2025-12-31')],
  ['el miércoles pasado pagué 250 de uber', E(250, 'trans_uber', '2026-09-30')],
  ['domingo 27 de septiembre comida con mi familia 1200', E(1200, 'food_restaurant', '2026-09-27')],
  ['gasté 90 el 2 de octubre en el cine', E(90, 'ent_cinema', '2026-10-02')],
  ['el 1ro de octubre pagué la renta 7500', E(7500, 'house_rent', '2026-10-01')],
  ['anoche pedí una pizza por rappi 330', E(330, 'food_delivery', '2026-10-02')],
  ['hace un mes pagué el seguro del coche 6800', E(6800, 'trans_car_insurance', '2026-09-03')],
  ['compré en el super el 12 de septiembre 650', E(650, 'food_supermarket', '2026-09-12')],
  ['compré 2 tacos 40 el viernes', E(40, 'food_fastfood', '2026-10-02')],
  ['el 15/03 pagué la luz 450', E(450, 'house_electricity', '2026-03-15')],
  ['pagué 450 de luz 15/03/2026', E(450, 'house_electricity', '2026-03-15')],
  ['el lunes pasado me depositaron la quincena 9800', E(9800, 'inc_salary', '2026-09-28', { type: 'income' })],
  ['me cayó el aguinaldo el 15 de diciembre 12000', E(12000, 'inc_bonus', '2025-12-15', { type: 'income' })],
  ['cobré 15000 el 30 de septiembre de mi nómina', E(15000, 'inc_salary', '2026-09-30', { type: 'income' })],
  // hoy, o sin fecha: queda "ahora"
  ['hoy pagué 50 de café', E(50, 'food_coffee')],
  ['esta mañana desayuné 80', E(80, null)],
  ['el 3 de octubre comí tacos 120', E(120, 'food_fastfood')],
  ['el sábado compré el súper 1800', E(1800, 'food_supermarket')],
  ['compré 1/2 kilo de queso 90', E(90, null)],
  // futuro: no se usa como fecha del movimiento todavía; se conserva
  ['mañana pago la renta 8000', E(8000, 'house_rent', null, { futureDate: '2026-10-04' })],
  ['el próximo viernes pago el internet 599', E(599, 'house_internet', null, { futureDate: '2026-10-09' })],
  // recurrente: NO es una fecha puntual
  ['mi netflix el 5 de cada mes 219', E(219, 'ent_streaming')],
  ['el 1 de cada mes pago 3000 de renta', E(3000, 'house_rent')],
  ['todos los viernes compro pizza 200', E(200, null)],
  ['de lunes a viernes pago 50 de camión', E(50, 'trans_public')],
];
