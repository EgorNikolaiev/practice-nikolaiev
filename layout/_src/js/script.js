@@include('_burger.js');

//cart open and close
const cartOpenButton = document.querySelector('.cart__open-button');
const cartCloseButton = document.querySelector('.cart__close-button');
const cartList = document.querySelector('.cart__body');

cartOpenButton.addEventListener('click', () => {
	cartOpenButton.setAttribute('aria-expanded', true);
	cartCloseButton.setAttribute('aria-expanded', true);
	cartList.classList.add('_open');
});

cartCloseButton.addEventListener('click', () => {
	cartOpenButton.setAttribute('aria-expanded', false);
	cartCloseButton.setAttribute('aria-expanded', false);
	cartList.classList.remove('_open');
});

@@include('_focus-visible.js');