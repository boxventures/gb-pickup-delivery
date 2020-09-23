const Container = window.styled.div`
  margin: 0 auto 1.5rem;
`

const CheckoutButton = window.styled.button`
  &:disabled {
    background: grey;
    border: none;
  }

  &:disabled {
    &:hover {
      background: grey;
    }
  }
`

const LoadingSpinner = window.styled.div`
  z-index: 1000;
  border: none;
  margin: 0px;
  padding: 0px;
  width: 100%;
  height: 100%;
  top: 0px;
  left: 0px;
  background: rgb(255, 255, 255);
  opacity: 0.6;
  cursor: default;
  position: absolute;

  @keyframes spin {
    100% {
      transform:rotate(360deg);
    }
  }

  &:after {
    position: absolute;
    left: 50%;
    top: 50%;
    margin-left: -13px;
    margin-top: -13px;
    content: "";
    width: 26px;
    height: 26px;
    display: inline-block;
    vertical-align: middle;
    border: 1px solid #bbb;
    border-left-color: #000;
    border-radius: 50%;
    animation: spin 450ms infinite linear;
  }
`
const CarouselContainer = window.styled.div`
  padding-bottom: 1rem;
  overflow-y: hidden;
  display: block;
`

const ServiceWindowBtn = window.styled.button`
  width: 7rem;
  padding: 0;
  font-size: 1rem;
  text-align: center;
  transition: 50ms all ease-in-out;
  cursor: pointer;
  opacity: 0.5;
  background: transparent;
  border: 0;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
  }

  &.active {
    opacity: 1;
    background: rgba(128, 128, 128, 0.1);
  }
`

const ServiceWindowDate = window.styled.div`
  line-height: 1em;
  margin-top: 10px;
  font-size: 4rem;
  font-weight: bold;
`

const TextArea = window.styled.textarea`
  &::placeholder {
    color: grey;
  }
}`

const ServiceWindow = ({ active, loading, window, handleClick }) => {
  return (
    <ServiceWindowBtn
      className={`${active ? 'active' : ''} carousel-cell`}
      disabled={loading}
      onClick={handleClick}
      id={`window-${window.code}`}>
      <span>{window.day}</span>
      <ServiceWindowDate>{window.date}</ServiceWindowDate>
      <div>{window.month}</div>
      <div>{window.name}</div>
    </ServiceWindowBtn>
  )
}

function GrocerBoxComponent({ config }) {
  const baseUri = 'https://grocerbox.ngrok.io';
  const shopify_domain = Shopify.shop.replace('.myshopify.com', '');
  const refundableHold = window.REFUNDABLE_HOLD_PRODUCT;
  const [availableWindows, setAvailableWindows] = React.useState([]);
  const [checkout, setCheckout] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [serviceWindows, setServiceWindows] = React.useState([]);
  const [cart, setCart] = React.useState();
  const [windowCode, setWindowCode] = React.useState();
  const [serviceType, setServiceTypeVal] = React.useState();
  const [cartLoading, setCartLoading] = React.useState(false);
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  {% comment %} These need to be consistent with the keys in the email notifications and backend Order {% endcomment %}
  const WINDOW_NAME_KEY = 'window';
  const WINDOW_CODE_KEY = 'code';
  const DATE_KEY = 'Date';
  const DELIVERY_NOTE = 'Delivery Note';
  let flkty = null;

  // Effects
  React.useEffect(() => {
    $(() => {
      {% comment %} For some reason the getCart sometimes returns undefined {% endcomment %}
      const cartPromise = CartJS.getCart();
      if (cartPromise){
        cartPromise.then(c => {
          console.log({ c });
          setCart(c);
        });
      }
    });
    {% comment %} init(); {% endcomment %}

    $(document).on('cart.ready', (event, c) => {
      console.log('cart ready: ', c)
    });

    $(document).on('cart.requestStarted', (event, c) => {
      setCartLoading(true);
    });

    $(document).on('cart.requestComplete', (event, c) => {
      setCartLoading(false);
      setCart({ ...c });
    });
  }, []);

  React.useEffect(() => {
    if (availableWindows.length > 0 && !flkty) {
      let initialIndex = 0;
      if (cart.attributes[WINDOW_CODE_KEY]) {
        initialIndex = availableWindows.map(w => w.code).indexOf(cart.attributes[WINDOW_CODE_KEY]);
      }

      setTimeout(() => {
        flkty = new Flickity( '.window-carousel', {
          // options
          cellAlign: 'left',
          draggable: true,
          initialIndex,
          pageDots: false
        });
      }, 0)
    }
  }, [availableWindows]);

  React.useEffect(() => {
    generateServiceWindows()
  }, [availableWindows]);

  React.useEffect(() => {
    if (cart && !loading && !loaded && availableWindows.length === 0) {
      getAvailableWindows(cart);
    }
  }, [cart]);

  // Functions

  const get = (path = '') => {
    return fetch(`${baseUri}/${path}`, {
      method: 'GET', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    });
  }

  const getAvailableWindows = (cart) => {
    setLoading(true);

    get(`shopify/private_shops/${encodeURIComponent(shopify_domain)}/available_windows?collections=${encodeURIComponent(window.CART_COLLECTIONS.join(','))}`)
      .then(res => res.json())
      .then((windows) => {
        setAvailableWindows(windows);
        if (cart.attributes[DATE_KEY] && !windows.find(w => w.date === cart.attributes[DATE_KEY])) {
          CartJS.setAttribute({
            [DATE_KEY]: null,
            [WINDOW_NAME_KEY]: null,
            [WINDOW_CODE_KEY]: null
          });
        }
      })
      .catch(error => handleError(`GrocerBox: Error fetching available windows: ${error}`))
      .finally(() => {
        setLoading(false);
        setLoaded(true);
      });
  }

  const selectWindow = (window) => {
    CartJS.setAttributes({
      [DATE_KEY]: window.date,
      [WINDOW_CODE_KEY]: window.code,
      [WINDOW_NAME_KEY]: window.name
    });
  }

  const handleError = (error) => {
    setLoading(false);
    console.log(`Error: ${error}`);
  }

  const generateServiceWindows = () => {
    setServiceWindows(availableWindows.map(formatWindow));
  }

  const formatWindow = (window) => {
    const [year, month, day] = window.date.split('-');
    const date = new Date(year, parseInt(month, 10) - 1, day);
    return {
      window: window,
      code: window.code,
      day: weekdays[date.getDay()],
      month: months[date.getMonth()],
      date: date.getDate(),
      name: window.name,
    };
  }

  const handleContinue = () => {
    window.location='/checkout';
  }

  // Checkout button should be disabled if loading, cart not loaded, window not selected or the only item in the cart is the refundable credit card hold item
  const checkoutDisabled = loading || cartLoading || !cart || !cart.attributes[WINDOW_CODE_KEY] || (cart.items.length === 1 && cart.items.find(item => item.handle === refundableHold));
  const selectedWindow = cart && cart.attributes[WINDOW_CODE_KEY] ?
    availableWindows.find(w => cart.attributes[WINDOW_CODE_KEY] === w.code) : null;
  const selected = selectedWindow ? formatWindow(selectedWindow) : null;

  return (
    <Container>
      <div>
        { loading ? <LoadingSpinner /> : '' }
        <h3>Select Time Slot</h3>

        { selected ? <p className="cart-item--content-title">{selected.day} {selected.month} {selected.date}, {selected.name}</p> : <p>Select your time slot.</p> }
      </div>

      <CarouselContainer className="window-carousel">
        {serviceWindows.map((window, index) =>
          <ServiceWindow
            key={index}
            active={selectedWindow ? selectedWindow.code === window.code : false}
            loading={loading || cartLoading}
            handleClick={() => selectWindow(window.window)}
            window={window}
          />
        )}
      </CarouselContainer>

      <div>
        <p><small>Pickup or Delivery can be selected at checkout.</small></p>
        <form method="post" action={`${window.SHOPIFY_CART_URL}`} noValidate="novalidate">
          <input type="hidden" name="attributes[collection_products_per_page]" value="" />
          <input type="hidden" name="attributes[collection_layout]" value="" />

          <div className="form-field">
            <label className="form-field-title" htmlFor="order-notes">
              Order Instructions
            </label>

            <textarea id="order-notes" className="form-field-input form-field-textarea" placeholder="Let us know here if you have any special requests." onBlur={(event) => CartJS.setNote(event.target.value)} rows="3" defaultValue={ cart ? cart.note : '' }></textarea>
          </div>

          <div className="form-field">
            <label className="form-field-title" htmlFor="delivery-notes">
              Delivery Notes
            </label>

            <textarea id="delivery-notes" className="form-field-input form-field-textarea" placeholder="Indicate any delivery instructions, buzzer numbers, etc." onBlur={(event) => CartJS.setAttribute(DELIVERY_NOTE, event.target.value)} rows="3" defaultValue={cart ? cart.attributes[DELIVERY_NOTE] : ''}></textarea>
          </div>

          <CheckoutButton type="submit" name="checkout" disabled={checkoutDisabled} className="button-primary cart-title-button" aria-label="Checkout">Checkout</CheckoutButton>
        </form>
      </div>
    </Container>
  )
}

ReactDOM.render(
  <GrocerBoxComponent />,
  document.getElementById('gb-component')
);
