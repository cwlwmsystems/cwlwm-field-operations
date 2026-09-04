export const pct=(value:number)=>`${(value*100).toFixed(1)}%`;
export const money=(value:number,currency="USD")=>new Intl.NumberFormat("en-US",{style:"currency",currency}).format(value);

export function conversion(attempts:number,orders:number){
  return attempts?orders/attempts:0;
}
