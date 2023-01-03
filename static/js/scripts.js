document.addEventListener('DOMContentLoaded', function () {
	console.log('document was not ready, place code here');
	
	const pathname = window.location.pathname;
	const navbar = document.querySelector('#nav');
	
	
	if (navbar) {
		navbar.querySelectorAll('a').forEach(function(x) {
			if (x.getAttribute('href') == pathname) {
				x.classList.add('activepage');
			};
			return;
		});
	}
});
