/** Purchase prices use the amount actually paid, including non-recoverable VAT. */
export function purchaseCost(
  price: number,
  grams: number,
  quantity: number,
  discount: number,
  shipping: number,
) {
  if (
    ![price, grams, quantity, discount, shipping].every(Number.isFinite) ||
    price < 0 ||
    grams <= 0 ||
    quantity < 1 ||
    !Number.isInteger(quantity) ||
    discount < 0 ||
    discount > 100 ||
    shipping < 0
  )
    throw Error('Neveljavni podatki nabave.');
  const goods = price * quantity * (1 - discount / 100),
    total = goods + shipping,
    kg = (grams * quantity) / 1000;
  return {
    goods,
    total,
    kg,
    perKg: total / kg,
    perSpool: total / quantity,
    savings: price * quantity - goods,
  };
}
