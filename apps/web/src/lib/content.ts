/** Static marketing copy from the design handoff (reviews, FAQs). Move to CMS when the client supplies real reviews. */
/** `plain`: the same quote without its Pay Later sentence, shown while Pay Later is switched off. */
export const REVIEWS: Record<'mruk' | 'skywood', { q: string; plain?: string; name: string; city: string; product: string }[]> = {
  mruk: [
    { q: 'I bought the G3500Q on Pay Later and it arrived the next day. Power cuts no longer stop my shop.', plain: 'I bought the G3500Q and it arrived the next day. Power cuts no longer stop my shop.', name: 'Asha Said', city: 'Zanzibar', product: 'G3500Q Generator' },
    { q: 'The French style fridge is beautiful and very quiet. Paying monthly from my salary made it easy.', plain: 'The French style fridge is beautiful and very quiet.', name: 'Neema Mushi', city: 'Dar es Salaam', product: 'UK F275 Refrigerator' },
    { q: 'Our 5HP pump runs the whole farm. The service centre in Arusha helped with installation.', name: 'Grace Mollel', city: 'Arusha', product: '5HP Water Pump' },
  ],
  skywood: [
    { q: 'The S 06 system fills the whole house. Great bass for the price.', name: 'John Kimaro', city: 'Arusha', product: 'S 06 Speaker System' },
    { q: 'The standing cooker with oven changed how we cook at home. Delivery was fast and careful.', name: 'Rehema Nyerere', city: 'Dodoma', product: 'SK6031GES Cooker' },
    { q: 'The tower fan is quiet and the timer is perfect for Dar nights.', name: 'Peter Lyimo', city: 'Dar es Salaam', product: 'TF4201TRL Tower Fan' },
  ],
};

/** Reviews for the storefront: Pay Later sentences dropped while the switch is off. */
export function reviewsFor(brand: 'mruk' | 'skywood', payLater: boolean) {
  return REVIEWS[brand].map((r) => ({ ...r, q: payLater ? r.q : (r.plain ?? r.q) }));
}

export const FAQS: [string, string][] = [
  ['How does Pay Later work?', 'Choose Pay Later at checkout, verify with Azania Bank, and repay monthly from your salary over 3, 6 or 12 months. Approval is by Azania Bank.'],
  ['How long is delivery?', 'Dar es Salaam: next day. Other regions: 2–4 days. Showroom pickup is ready in 24 hours.'],
  ['How do I claim warranty?', 'Send a request on this page with your order number and a photo. A technician from the nearest service centre will contact you.'],
  ['Can I return a product?', 'Unused products in original packaging can be returned within 7 days. Contact support to arrange collection.'],
];

export const CATEGORY_BLURB: Record<'mruk' | 'skywood', string> = {
  mruk: 'Everything from refrigeration to power, in one place.',
  skywood: 'Music, refrigeration, kitchen, fans and air conditioning.',
};
