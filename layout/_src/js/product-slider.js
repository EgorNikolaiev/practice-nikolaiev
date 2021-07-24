@@include('_swiper-bundle.js');

//product slider
var swiper = new Swiper(".thumbs-slider__container", {
	spaceBetween: 16,
	slidesPerView: "auto",
	watchSlidesVisibility: true,
	watchSlidesProgress: true,
});
var swiper2 = new Swiper(".product-slider__container", {
	spaceBetween: 10,
	slidesPerView: 1,
	navigation: {
		nextEl: ".swiper-button-next",
		prevEl: ".swiper-button-prev",
	},
	thumbs: {
		swiper: swiper,
	},
});
