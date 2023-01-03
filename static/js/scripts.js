document.addEventListener('DOMContentLoaded', function () {
	console.log('document was not ready, place code here');
	
	const pathname = window.location.pathname.replace(/\/+$/, '');
	const navbar = document.querySelector('#nav');
	
	
	if (navbar) {
		navbar.querySelectorAll('a').forEach(function(x) {
			if (x.getAttribute('href').replace(/\/+$/, '') == pathname) {
				x.classList.add('activepage');
			};
			return;
		});
	}
});
