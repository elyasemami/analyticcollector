function getCurrentDate(){
	return new Date().toISOString();
}

function formatCurrency(amount, locale = 'en-US', currency = 'USD'){
	return new Intl.NumberFormat(locale, {style: 'currency', currency}).format(amount);

}

module.exports = {getCurrentDate, formatCurrency};
