@@include('_burger.js');

if ((typeof window.Shopify) == 'undefined') {
	window.Shopify = {};
}

const trapFocusHandlers = {};

function getFocusableElements(container) {
	return Array.from(
		container.querySelectorAll(
			"summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
		)
	);
}

function trapFocus(container, elementToFocus = container) {
	var elements = getFocusableElements(container);
	var first = elements[0];
	var last = elements[elements.length - 1];

	removeTrapFocus();

	trapFocusHandlers.focusin = (event) => {
		if (
			event.target !== container &&
			event.target !== last &&
			event.target !== first
		)
			return;

		document.addEventListener('keydown', trapFocusHandlers.keydown);
	};

	trapFocusHandlers.focusout = function () {
		document.removeEventListener('keydown', trapFocusHandlers.keydown);
	};

	trapFocusHandlers.keydown = function (event) {
		if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
		// On the last focusable element and tab forward, focus the first element.
		if (event.target === last && !event.shiftKey) {
			event.preventDefault();
			first.focus();
		}

		//  On the first focusable element and tab backward, focus the last element.
		if (
			(event.target === container || event.target === first) &&
			event.shiftKey
		) {
			event.preventDefault();
			last.focus();
		}
	};

	document.addEventListener('focusout', trapFocusHandlers.focusout);
	document.addEventListener('focusin', trapFocusHandlers.focusin);

	elementToFocus.focus();
}

function removeTrapFocus(elementToFocus = null) {
	document.removeEventListener('focusin', trapFocusHandlers.focusin);
	document.removeEventListener('focusout', trapFocusHandlers.focusout);
	document.removeEventListener('keydown', trapFocusHandlers.keydown);

	if (elementToFocus) elementToFocus.focus();
}

Shopify.bind = function (fn, scope) {
	return function () {
		return fn.apply(scope, arguments);
	}
};

function debounce(fn, wait) {
	let t;
	return (...args) => {
		clearTimeout(t);
		t = setTimeout(() => fn.apply(this, args), wait);
	};
}

const serializeForm = form => {
	const obj = {};
	const formData = new FormData(form);
	for (const key of formData.keys()) {
		obj[key] = formData.get(key);
	}
	return JSON.stringify(obj);
};

function fetchConfig(type = 'json') {
	return {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'Accept': `application/${type}` }
	};
}


//--------------------------------------------------------------------------------------------------------
class CartRemoveButton extends HTMLElement {
	constructor() {
		super();
		this.addEventListener('click', (event) => {
			event.preventDefault();
			this.closest('cart-items').updateQuantity(this.dataset.index, 0);
		});
	}
}

customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
	constructor() {
		super();

		this.lineItemStatusElement = document.getElementById('shopping-cart-line-item-status');

		this.currentItemCount = Array.from(this.querySelectorAll('[name="updates[]"]'))
			.reduce((total, quantityInput) => total + parseInt(quantityInput.value), 0);

		this.debouncedOnChange = debounce((event) => {
			this.onChange(event);
		}, 300);

		this.addEventListener('change', this.debouncedOnChange.bind(this));
	}

	onChange(event) {
		this.updateQuantity(event.target.dataset.index, event.target.value, document.activeElement.getAttribute('name'));
	}

	getSectionsToRender() {
		return [
			{
				id: 'cart-notification-list',
				section: document.getElementById('cart-notification-list').dataset.id,
				selector: '.js-contents',
			},
			{
				id: 'cart-icon-bubble',
				section: 'cart-icon-bubble',
				selector: '.shopify-section'
			},
			{
				id: 'cart-notification-count',
				section: 'cart-notification-count',
				selector: '.shopify-section'
			},
			{
				id: 'cart-notification-amount',
				section: 'cart-notification-amount',
				selector: '.shopify-section'
			},
			{
				id: 'cart-live-region-text',
				section: 'cart-live-region-text',
				selector: '.shopify-section'
			}
			// {
			//   id: 'main-cart-footer',
			//   section: document.getElementById('main-cart-footer').dataset.id,
			//   selector: '.js-contents',
			// }
		];
	}

	updateQuantity(line, quantity, name) {
		this.enableLoading(line);

		const body = JSON.stringify({
			line,
			quantity,
			sections: this.getSectionsToRender().map((section) => section.section),
			sections_url: window.location.pathname
		});

		fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
			.then((response) => {
				return response.text();
			})
			.then((state) => {
				const parsedState = JSON.parse(state);
				this.classList.toggle('is-empty', parsedState.item_count === 0);
				document.getElementById('main-cart-footer')?.classList.toggle('is-empty', parsedState.item_count === 0);

				this.getSectionsToRender().forEach((section => {
					const elementToReplace =
						document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);

					elementToReplace.innerHTML =
						this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
				}));

				this.updateLiveRegions(line, parsedState.item_count);
				document.getElementById(`CartItem-${line}`)?.querySelector(`[name="${name}"]`)?.focus();
				this.disableLoading();
			}).catch(() => {
				this.querySelectorAll('.loading-overlay').forEach((overlay) => overlay.classList.add('hidden'));
				document.getElementById('cart-errors').textContent = window.cartStrings.error;
				this.disableLoading();
			});
	}

	updateLiveRegions(line, itemCount) {
		if (this.currentItemCount === itemCount) {
			document.getElementById(`Line-item-error-${line}`)
				.querySelector('.cart-item__error-text')
				.innerHTML = window.cartStrings.quantityError.replace(
					'[quantity]',
					document.getElementById(`Quantity-${line}`).value
				);
		}

		this.currentItemCount = itemCount;
		this.lineItemStatusElement.setAttribute('aria-hidden', true);

		const cartStatus = document.getElementById('cart-live-region-text');
		cartStatus.setAttribute('aria-hidden', false);

		setTimeout(() => {
			cartStatus.setAttribute('aria-hidden', true);
		}, 1000);
	}

	getSectionInnerHTML(html, selector) {
		return new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector(selector).innerHTML;
	}

	enableLoading(line) {
		document.getElementById('cart-notification-list').classList.add('cart__items--disabled');
		this.querySelectorAll('.loading-overlay')[line - 1].classList.remove('hidden');
		document.activeElement.blur();
		this.lineItemStatusElement.setAttribute('aria-hidden', false);
	}

	disableLoading() {
		document.getElementById('cart-notification-list').classList.remove('cart__items--disabled');
	}
}

customElements.define('cart-items', CartItems);


class CartNotification extends HTMLElement {
	constructor() {
		super();

		this.notification = document.getElementById('cart-notification');
		this.header = document.querySelector('sticky-header');
		this.onBodyClick = this.handleBodyClick.bind(this);

		this.notification.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
		this.querySelectorAll('.cart__close-button').forEach((closeButton) =>
			closeButton.addEventListener('click', this.close.bind(this))
		);
	}

	open() {
		this.notification.classList.add('animate', 'active');

		this.notification.addEventListener('transitionend', () => {
			this.notification.focus();
			trapFocus(this.notification);
		}, { once: true });

		document.body.addEventListener('click', this.onBodyClick);
	}

	close() {
		this.notification.classList.remove('active');

		document.body.removeEventListener('click', this.onBodyClick);

		removeTrapFocus(this.activeElement);
	}

	renderContents(parsedState) {
		this.productId = parsedState.id;
		this.getSectionsToRender().forEach((section => {
			document.getElementById(section.id).innerHTML =
				this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
		}));

		this.header?.reveal();
		this.open();
	}

	getSectionsToRender() {
		return [
			{
				id: 'cart-notification-list',
			},
			{
				id: 'cart-notification-count'
			},
			{
				id: 'cart-notification-amount'
			},
			{
				id: 'cart-icon-bubble'
			}
		];
	}

	getSectionInnerHTML(html, selector = '.shopify-section') {
		return new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector(selector).innerHTML;
	}

	handleBodyClick(evt) {
		const target = evt.target;
		if (target !== this.notification && !target.closest('cart-notification')) {
			const disclosure = target.closest('details-disclosure');
			this.activeElement = disclosure ? disclosure.querySelector('summary') : null;
			this.close();
		}
	}

	setActiveElement(element) {
		this.activeElement = element;
	}
}

customElements.define('cart-notification', CartNotification);

class ProductForm extends HTMLElement {
	constructor() {
		super();

		this.form = this.querySelector('form');
		this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
		this.cartNotification = document.querySelector('cart-notification');
	}

	onSubmitHandler(evt) {
		evt.preventDefault();
		this.cartNotification.setActiveElement(document.activeElement);

		const submitButton = this.querySelector('[type="submit"]');

		submitButton.setAttribute('disabled', true);
		submitButton.classList.add('loading');

		const body = JSON.stringify({
			...JSON.parse(serializeForm(this.form)),
			sections: this.cartNotification.getSectionsToRender().map((section) => section.id),
			sections_url: window.location.pathname
		});

		fetch(`${routes.cart_add_url}`, { ...fetchConfig('javascript'), body })
			.then((response) => response.json())
			.then((parsedState) => {
				this.cartNotification.renderContents(parsedState);
			})
			.catch((e) => {
				console.error(e);
			})
			.finally(() => {
				submitButton.classList.remove('loading');
				submitButton.removeAttribute('disabled');
			});
	}
}

customElements.define('product-form', ProductForm);

//variants
class VariantSelects extends HTMLElement {
	constructor() {
		super();
		this.addEventListener('change', this.onVariantChange);
	}

	onVariantChange() {
		this.updateOptions();
		this.updateMasterId();
		this.toggleAddButton(true, '', false);
		this.updatePickupAvailability();

		if (!this.currentVariant) {
			this.toggleAddButton(true, '', true);
			this.setUnavailable();
		} else {
			this.updateMedia();
			this.updateURL();
			this.updateVariantInput();
			this.renderProductInfo();
		}
	}

	updateOptions() {
		this.options = Array.from(this.querySelectorAll('select'), (select) => select.value);
	}

	updateMasterId() {
		this.currentVariant = this.getVariantData().find((variant) => {
			return !variant.options.map((option, index) => {
				return this.options[index] === option;
			}).includes(false);
		});
	}

	updateMedia() {
		if (!this.currentVariant || !this.currentVariant?.featured_media) return;
		const newMedia = document.querySelector(
			`[data-media-id="${this.dataset.section}-${this.currentVariant.featured_media.id}"]`
		);
		if (!newMedia) return;
		const parent = newMedia.parentElement;
		parent.prepend(newMedia);
		window.setTimeout(() => { parent.scroll(0, 0) });
	}

	updateURL() {
		if (!this.currentVariant) return;
		window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
	}

	updateVariantInput() {
		const productForms = document.querySelectorAll(`#product-form-${this.dataset.section}, #product-form-installment`);
		productForms.forEach((productForm) => {
			const input = productForm.querySelector('input[name="id"]');
			input.value = this.currentVariant.id;
			input.dispatchEvent(new Event('change', { bubbles: true }));
		});
	}

	updatePickupAvailability() {
		const pickUpAvailability = document.querySelector('pickup-availability');
		if (!pickUpAvailability) return;

		if (this.currentVariant?.available) {
			pickUpAvailability.fetchAvailability(this.currentVariant.id);
		} else {
			pickUpAvailability.removeAttribute('available');
			pickUpAvailability.innerHTML = '';
		}
	}

	renderProductInfo() {
		fetch(`${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${this.dataset.section}`)
			.then((response) => response.text())
			.then((responseText) => {
				const id = `price-${this.dataset.section}`;
				const html = new DOMParser().parseFromString(responseText, 'text/html')
				const destination = document.getElementById(id);
				const source = html.getElementById(id);

				if (source && destination) destination.innerHTML = source.innerHTML;

				document.getElementById(`price-${this.dataset.section}`)?.classList.remove('visibility-hidden');
				this.toggleAddButton(!this.currentVariant.available, window.variantStrings.soldOut);
			});
	}

	toggleAddButton(disable = true, text, modifyClass = true) {
		const addButton = document.getElementById(`product-form-${this.dataset.section}`)?.querySelector('[name="add"]');

		if (!addButton) return;

		if (disable) {
			addButton.setAttribute('disabled', true);
			if (text) addButton.textContent = text;
		} else {
			addButton.removeAttribute('disabled');
			addButton.textContent = window.variantStrings.addToCart;
		}

		if (!modifyClass) return;
	}

	setUnavailable() {
		const addButton = document.getElementById(`product-form-${this.dataset.section}`)?.querySelector('[name="add"]');
		if (!addButton) return;
		addButton.textContent = window.variantStrings.unavailable;
		document.getElementById(`price-${this.dataset.section}`)?.classList.add('visibility-hidden');
	}

	getVariantData() {
		this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
		return this.variantData;
	}
}

customElements.define('variant-selects', VariantSelects);

class VariantRadios extends VariantSelects {
	constructor() {
		super();
	}

	updateOptions() {
		const fieldsets = Array.from(this.querySelectorAll('fieldset'));
		this.options = fieldsets.map((fieldset) => {
			return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked).value;
		});
	}
}

customElements.define('variant-radios', VariantRadios);


// quantity
class QuantityInput extends HTMLElement {
	constructor() {
		super();
		this.input = this.querySelector('input');
		this.changeEvent = new Event('change', { bubbles: true })

		this.querySelectorAll('button').forEach(
			(button) => button.addEventListener('click', this.onButtonClick.bind(this))
		);
	}

	onButtonClick(event) {
		event.preventDefault();
		const previousValue = this.input.value;

		event.target.name === 'plus' ? this.input.stepUp() : this.input.stepDown();
		if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
	}
}
customElements.define('quantity-input', QuantityInput);

//cart open and close
const cartOpenButton = document.querySelector('.cart__open-button');
const cartCloseButton = document.querySelector('.cart__close-button');
const cartList = document.querySelector('.cart__body');

if (cartOpenButton != undefined) {
	cartOpenButton.addEventListener('click', () => {
		cartList.classList.add('active');
	});
}
if (cartList != undefined) {
	cartList.addEventListener('mousedown', function (e) {
		if (!e.target.closest('.cart__content')) {
			cartList.classList.remove('active');
		}
	});
}

@@include('_focus-visible.js');