const menuButton = document.querySelector('.menu__button');
const menuList = document.querySelector('.menu__list');

menuButton.addEventListener('click', () => {
	menuButton.setAttribute('aria-expanded', !((menuButton.getAttribute('aria-expanded')==='true')));
	document.body.classList.toggle('_lock');
	menuButton.classList.toggle('menu__button_open');
	menuList.classList.toggle('menu__list_open');
});