// ========================================================================
// PICKUP & DELIVERY - MA
// Use a free product to store service type and window
// ========================================================================

// ========================================================================
// REFUNDABLE HOLD - MA
// If setting is enabled ensure that refundable hold is added to cart
// ========================================================================

const GB_ROOT = 'gb-pickup-delivery';
const GB_SECTION = 'gb-pickup-delivery-section';
const GB_SERVICE_WINDOW = 'gb-service-window';
const GB_SERVICE_WINDOW_CONTAINER = 'gb-service-window-container';
const GB_SERVICE_TYPE = 'gb-service-type';
const GB_SERVICE_TYPE_CONTAINER = 'gb-service-type-container';

const componentHTML = `
  <div>
    <style>
      .gb-hidden {
        display: none;
      }
      #${GB_ROOT} {
        margin-bottom: 3rem;
        padding-bottom: 3rem;}
      #${GB_ROOT} .${GB_SECTION} {
        text-align: center;
        margin: 1.5rem 0;}
        #${GB_ROOT} .${GB_SECTION} h3 {
          margin: 1.5rem 0;}
      #${GB_SERVICE_WINDOW_CONTAINER} {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;}
      .${GB_SERVICE_WINDOW} {
        padding: 1rem;
        text-align: center;
        border: 1px solid;
        margin: 1rem;
        cursor: pointer;
        opacity: 0.5;
        transition: 100ms all ease-in-out;}
      .${GB_SERVICE_WINDOW}.active {
        transform: scale(1.2);
        opacity: 1;}
      .${GB_SERVICE_WINDOW}:hover {
        opacity: 0.9;}

        .btn {
          padding: 0.5rem 1rem;
        }
        .btn:disabled {
          background: grey;
          color: white;
          cursor: not-allowed;}

        .gb-radio-group {
          display: flex;
          text-transform: capitalize;
          justify-content: center;}
        .gb-radio-btn {
          opacity: 0.8rem;
          flex: 1;
          margin: 0;
          border: 1px solid black;
          text-align: center;
          max-width: 15rem;
          padding: 1rem;
          font-size: 1.2rem;}
        .gb-radio-btn.active {
          opacity: 1;
          background: black;
          color: white;}

        .gb-invisible {
            opacity: 0;
            position: absolute;
            height: 0;
            width: 0;
            cursor: pointer;}
    </style>

    <section class="${GB_SECTION}">
      <h3>Would you like pickup or delivery?</h3>

      <div id="${GB_SERVICE_TYPE_CONTAINER}" class="gb-radio-group"></div>
    </section>

    <section class="${GB_SECTION}">
      <h3>When?</h3>
      <div id="${GB_SERVICE_WINDOW_CONTAINER}"></div>
    </section>

    <section class="${GB_SECTION} mt-5">
      <button class="btn button gb-continue-btn" onclick="GrocerBox.selectTab('gb-cart')">Continue</button>
      <div class="gb-loading gb-ellipsis" style="display: none;">
        <div></div><div></div><div></div><div></div>
      </div>
    </section>
  </div>
`

class GrocerBox {
  constructor(base_uri, refundable_hold_product, grocerbox_product) {
    console.log({ base_uri, refundable_hold_product, grocerbox_product });
    this.availableWindows = [];
    this.loading = false;
    this.shopify_domain = encodeURIComponent(Shopify.shop.replace('.myshopify.com', ''));
    this.base_uri = base_uri;
    this.refundable_hold_product = refundable_hold_product
    this.grocerbox_product = grocerbox_product;
  }

  init() {
    this.getAvailableWindows().then(() => {
      this.setProduct().then(() => {
        this.initializeCartItems().then(() => {
          this.renderTemplate().then(() => {
            this.renderWindows();
            this.renderServiceTypes();
          });
        });
      });
    });
  }

  setProduct() {
    return this.getProduct(this.grocerbox_product)
      .then(product => this.product = product)
      .catch(error => this.handleError(`Error finding Grocer Box product: ${error}`))
  }

  selectTab(tab) {
    document.querySelector('.gb-tab-link[data-tab="cart"]').click();
  }

  findVariantById(id) {
    return this.product.variants.find(variant => variant.id === id);
  }

  findVariant(serviceType, windowIndex) {
    return this.product.variants.find(variant => variant.option1.toLowerCase() === serviceType.toLowerCase() && variant.option2 === `${windowIndex}`)
  }

  stopLoading() {
    $(`.btn`).removeAttr('disabled');
    $('.gb-continue-btn').show();
    $('.gb-loading').hide();
  }

  startLoading() {
    $(`.btn`).prop("disabled", true);
    $('.gb-continue-btn').hide();
    $('.gb-loading').show();
  }

  renderTemplate() {
    return new Promise((resolve, reject) => {
      $(`#${GB_ROOT}`).fadeOut("fast", function(){
        this.innerHTML = componentHTML;
        $(`#${GB_ROOT}`).fadeIn("fast", function() {
          resolve();
        });
      });
    })
  }

  handleError(error) {
    console.log(`Error: ${error}`);
  }

  setVariant(variant) {
    const windowIndex = parseInt(variant.option2, 10);
    const properties = { service_type: variant.option1, service_window: this.availableWindows[windowIndex] }
    this.startLoading();
    CartJS.removeItemById(this.getItem().id, {
      success: (data, textStatus, jqXHR) => {
        CartJS.addItem(variant.id, 1, properties, {
          success: () => this.stopLoading(),
          error: (error) => {
            this.handleError(`Error adding variant: ${JSON.stringify(error)}`);
            this.stopLoading();
          }
        })
      },
      error: (error) => {
        this.handleError(`Error removing variant: ${JSON.stringify(error)}`)
        this.stopLoading();
      }
    })
  }

  getItem() {
    return CartJS.cart.items.find(item => item.handle === this.grocerbox_product);
  }

  get(path = '', data = {}) {
    return fetch(`${this.base_uri}/${path}`, {
      method: 'GET', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    });
  }

  currentServiceWindow() {
    return this.getItem().properties.service_window;
  }
  currentWindowIndex() {
    return parseInt(this.getItem().variant_options[1], 10);
  }
  currentServiceType() {
    return this.getItem().variant_options[0];
  }

  renderServiceTypes() {
    const container = $(`#${GB_SERVICE_TYPE_CONTAINER}`);
    if (!container) { return; }

    const currentServiceType = this.currentServiceType();

    container.append(`
      <button class="gb-radio-btn ${GB_SERVICE_TYPE} ${currentServiceType === 'P' ? 'active' : ''}"
        onclick="GrocerBox.selectServiceType(event, 'P')">
        Pickup
      </button>

      <button class="gb-radio-btn ${GB_SERVICE_TYPE} ${currentServiceType === 'D' ? 'active' : ''}"
        onclick="GrocerBox.selectServiceType(event, 'D')">
        Delivery
      </button>
    `)
  }

  selectServiceType(evt, serviceType) {
    if (serviceType === this.currentServiceType()) { return; }

    const variant = this.findVariant(serviceType, this.currentWindowIndex());
    this.setVariant(variant);
    $(`.${GB_SERVICE_TYPE}`).removeClass('active');
    $(evt.currentTarget).addClass("active");
  }

  selectServiceWindow(evt, code) {
    if (code === this.currentServiceWindow().code) { return; }

    const windowIndex = this.availableWindows.map(w => w.code).indexOf(code);
    const variant = this.findVariant(this.currentServiceType(), windowIndex);
    this.setVariant(variant);
    $(`.${GB_SERVICE_WINDOW}`).removeClass('active');
    $(evt.currentTarget).addClass("active");
  }

  getAvailableWindows() {
    return new Promise((resolve, reject) => {
      if (this.availableWindows.length > 0) {
        resolve(this.availableWindows);
        return;
      }

      this.get(`shopify/private_shops/available_windows/${this.shopify_domain}`)
        .then(res => res.json())
        .then(windows => {
          this.availableWindows = windows;
          resolve(windows);
        })
        .catch(error => {
          this.handleError(`GrocerBox: Error fetching available windows: ${error}`)
          reject(error);
        });
    });
  }

  renderWindows() {
    const container = $(`#${GB_SERVICE_WINDOW_CONTAINER}`);
    if (!container) { return; }

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const options = this.availableWindows.reduce((schedule, window) => ({ ...schedule, [window.date]: window }), {});

    Object.keys(options).forEach((key) => {
      const window = options[key];
      const [year, month, day] = window.date.split('-');
      const date = new Date(year, parseInt(month, 10) - 1, day);
      const currentWindow = this.currentServiceWindow();
      const isActive = currentWindow && currentWindow.code === window.code || false;

      container.append(`
        <div class="${GB_SERVICE_WINDOW} ${isActive ? 'active' : ''}"
          onclick="GrocerBox.selectServiceWindow(event, '${window.code}')">
          <h4>${weekdays[date.getDay()]}</h4>
          <p>${months[date.getMonth()]} ${date.getDate()}</p>
          <span>${window.name}</span>
        </div>`
      )
    })
  }

  getProduct(handle) {
    return fetch(`/products/` + handle + '.js').then(res => res.json())
  }

  initializeCartItems() {
    return CartJS.getCart().then(cart => {
      if (this.grocerbox_product) {
        const hasGrocerBoxProduct = cart.items.map(item => item.handle).indexOf(this.grocerbox_product) !== -1;

        if (!hasGrocerBoxProduct) {
          this.getProduct(this.grocerbox_product).then((product) => {
            this.product = product;
            const variant = product.variants[0];
            const properties = { service_type: variant.option1, service_window: this.availableWindows[parseInt(variant.option2, 10)] }
            CartJS.addItem(variant.id, 1, properties, {
              error: (error) => this.handleError(`Error adding Grocer Box product: ${error}`)
            });
          }).catch(error => console.log('Error fetching Grocer Box Product'));
        }
      }

      if (this.refundable_hold_product) {
        const hasHold = cart.items.map(item => item.handle).indexOf(this.refundable_hold_product) !== -1;

        if (!hasHold) {
          this.getProduct(this.refundable_hold_product).then(product => {
            if (product && product.variants.length) {
              CartJS.addItem(product.variants[0].id, 1, {}, {
                error: (error) => this.handleError(`Error adding Refundable Hold: ${error}`)
              });
            }
          });
        }
      }
    })
  }
}