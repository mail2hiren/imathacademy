/* ============================================================
   iMathAcademy — Money, in the family's own currency
   ------------------------------------------------------------
   Fees were already configured per country and Razorpay is set up
   to take foreign currency, but every screen asked for the Indian
   plans and charged in rupees. A family in Dubai saw a rupee price
   and was charged in rupees.
   ============================================================ */

var Money = (function () {
  'use strict';

  var BY_COUNTRY = {
    IN: { code: 'INR', symbol: '\u20B9',   locale: 'en-IN' },
    AE: { code: 'AED', symbol: 'AED ',       locale: 'en-AE' },
    US: { code: 'USD', symbol: '$',          locale: 'en-US' },
    GB: { code: 'GBP', symbol: '\u00A3',    locale: 'en-GB' },
    SG: { code: 'SGD', symbol: 'S$',         locale: 'en-SG' },
    AU: { code: 'AUD', symbol: 'A$',         locale: 'en-AU' },
    CA: { code: 'CAD', symbol: 'C$',         locale: 'en-CA' },
    MY: { code: 'MYR', symbol: 'RM ',        locale: 'en-MY' },
    NZ: { code: 'NZD', symbol: 'NZ$',        locale: 'en-NZ' },
    ZA: { code: 'ZAR', symbol: 'R ',         locale: 'en-ZA' }
  };

  function forCountry(cc) {
    return BY_COUNTRY[String(cc || 'IN').toUpperCase()] || BY_COUNTRY.IN;
  }

  /** "₹1,499" or "AED 250" */
  function format(amount, cc) {
    var c = forCountry(cc);
    return c.symbol + Number(amount || 0).toLocaleString(c.locale);
  }

  /** What Razorpay should be told to charge in. */
  function currencyCode(cc) { return forCountry(cc).code; }

  /* Most currencies are charged in their smallest unit — paise, cents,
     fils. The zero-decimal ones are not, and multiplying those by 100
     would charge a hundred times too much. */
  var ZERO_DECIMAL = ['JPY', 'KRW', 'VND'];
  function smallestUnit(amount, cc) {
    var code = currencyCode(cc);
    return ZERO_DECIMAL.indexOf(code) > -1
      ? Math.round(Number(amount || 0))
      : Math.round(Number(amount || 0) * 100);
  }

  return { forCountry: forCountry, format: format,
           currencyCode: currencyCode, smallestUnit: smallestUnit };
})();
