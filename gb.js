const Container = window.styled.div`
  max-width: 48rem;
  margin: 0 auto 1.5rem;
  text-align: center;
`
const Section = window.styled.section`
  margin: 1.5rem auto;
  display: flex;
  flex-direction: column;
  align-items: center;
`
const SectionTitle = window.styled.h2`
  margin-bottom: 1.5rem;
`
const Button = window.styled.button`
  background: white;
  color: #666666;
  border: 1px solid #dddddd;
  width: 160px;
  text-transform: uppercase;
  height: 50px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: 100ms all ease-in-out;

  &:hover,
  &.active,
  &.primary {
    border: 0;
    color: white;
  }

  &:hover {
    background: #898989;
  }
  &.active {
    background: #414141;
  }
  &.primary {
    background: #75a500;
  }

  &:disabled {
    cursor: not-allowed;
  }
`

const Row = window.styled.div`
  display: flex;
  ${props => props.wrap ? 'flex-wrap: wrap;': ''}
  ${props => props.center ? 'justify-content: center;': ''}
`

const ServiceWindowBtn = window.styled.button`
  width: 12rem;
  padding: 1rem 0;
  font-size: 1.2rem;
  text-align: center;
  transition: 50ms all ease-in-out;
  border: 1px solid;
  cursor: pointer;

  opacity: 0.5;

  &:hover {
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.5;
  }

  &.active {
    opacity: 1;
    background: #414141;
    color: white;
    border: 0;
  }
`

const ServiceWindowDate = window.styled.p`
  font-size: 2rem;
  margin: 0;
  font-weight: bold;
  padding: 0;
`

const ServiceWindow = ({ active, loading, window, handleClick }) => {
  return (
    <ServiceWindowBtn
      className={`${active ? 'active' : ''}`}
      disabled={loading}
      onClick={handleClick}>
      <span>{window.day}</span>
      <ServiceWindowDate>{window.date}</ServiceWindowDate>
      <span>{window.name}</span>
    </ServiceWindowBtn>
  )
}

function GrocerBoxComponent({ config }) {
  const [availableWindows, setAvailableWindows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [serviceWindows, setServiceWindows] = React.useState([]);
  const [product, setProduct] = React.useState();
  const [cart, setCart] = React.useState(config.cart);
  const [gbItem, setGbItem] = React.useState();
  const [windowCode, setWindowCode] = React.useState();
  const [serviceType, setServiceTypeVal] = React.useState();
  const [cartLoading, setCartLoading] = React.useState(false);

  // Effects
  React.useEffect(() => {
    init();

    $(document).on('cart.ready', (event, c) => {
      // console.log({ event, c })
    });

    $(document).on('cart.requestStarted', (event, c) => {
      // console.log({ event, c })
      setCartLoading(true);
    });

    $(document).on('cart.requestComplete', (event, c) => {
      // console.log({ event, c })
      setCartLoading(false);
      setCart({ ...c });
    });
  }, []);

  React.useEffect(() => {
    if (cart) {
      const item = cart.items.find(item => item.handle === config.grocerbox_product);
      setGbItem({ ...item })
    }
  }, [cart]);

  React.useEffect(() => {
    if (gbItem && gbItem.properties && gbItem.properties.code) {
      setWindowCode(atob(gbItem.properties.code).split(':')[1])
    }
    if (gbItem && gbItem.variant_options) {
      setServiceTypeVal(gbItem.variant_options[0]);
    }
  }, [gbItem]);

  React.useEffect(() => {
    // console.log({ product })
  }, [product]);

  React.useEffect(() => {
    generateServiceWindows()
  }, [availableWindows]);

  // Functions
  const init = () => {
    getAvailableWindows().then((windows) => {
      setAvailableWindows(windows);
      setGrocerBoxItem(cart.items, windows);
    });
  }

  const get = (path = '', data = {}) => {
    return fetch(`${config.grocerbox_domain}/${path}`, {
      method: 'GET', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    });
  }

  const getAvailableWindows = () => {
    return get(`shopify/private_shops/available_windows/${config.shopify_domain}`)
      .then(res => res.json())
      .catch(error => handleError(`GrocerBox: Error fetching available windows: ${error}`));
  }

  const getProduct = (handle) => {
    return fetch(`/products/` + handle + '.js')
      .then(res => res.json())
      .catch(error => handleError(`GrocerBox: Error fetching product '${handle}': ${error}`))
  }

  // If no gb item, set to first variant.
  // If gb item but window not available, reset to first variant.
  const setGrocerBoxItem = (items, windows) => {
    getProduct(config.grocerbox_product)
      .then(res => {
        setProduct(res);
        const firstVariant = res.variants[0];
        const grocerBoxItem = items.find(item => item.handle === config.grocerbox_product);
        if (!grocerBoxItem) {
          const window = windows[parseInt(firstVariant.option2, 10)];
          CartJS.addItem(firstVariant.id, 1, { code: btoa(`${firstVariant.option1}:${window.code}`) }, {
            error: (error) => handleError(`Error adding Grocer Box product: ${error}`)
          });
        } else {
          const [_, code] = atob(grocerBoxItem.properties.code).split(':');
          const windowIsAvailable = windows.find(w => w.code === code);
          if (!windowIsAvailable) {
            setVariant(firstVariant);
          }
        }
      });
  }

  const setServiceType = (type) => {
    const variant = findVariant(type, windowCode);
    setVariant(variant);
  }

  const setServiceWindow = (code) => {
    const variant = findVariant(gbItem.variant_options[0], code);
    setVariant(variant);
  }

  const findVariant = (type, code) => {
    const index = availableWindows.map(w => w.code).indexOf(code);
    return product.variants.find(variant =>
      variant.option1.toLowerCase() === type.toLowerCase() &&
      variant.option2 === `${index}`)
  }

  const setVariant = (variant) => {
    const code = availableWindows[parseInt(variant.option2, 10)].code;
    const type = variant.option1;
    const properties = { code: btoa(`${type}:${code}`) }
    setLoading(true)
    CartJS.removeItemById(gbItem.id, {
      success: (data, textStatus, jqXHR) => {
        CartJS.addItem(variant.id, 1, properties, {
          success: () => setLoading(false),
          error: (error) => handleError(`Error adding variant: ${JSON.stringify(error)}`)
        });
      },
      error: (error) => handleError(`Error removing variant: ${JSON.stringify(error)}`)
    })
  }

  const handleError = (error) => {
    setLoading(false);
    console.log(`Error: ${error}`);
  }

  const generateServiceWindows = () => {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const options = availableWindows.map((window) => {
      const [year, month, day] = window.date.split('-');
      const date = new Date(year, parseInt(month, 10) - 1, day);
      return {
        code: window.code,
        day: weekdays[date.getDay()],
        date: `${months[date.getMonth()]} ${date.getDate()}`,
        name: window.name,
      };
    });
    setServiceWindows(options);
  }

  const handleContinue = () => {
    window.location='/checkout';
  }

  const checkoutDisabled = !windowCode || !serviceType;

  return (
    <Container>
      <Section>
        <SectionTitle>Would you like pickup or delivery?</SectionTitle>

        <Row>
          <Button
            className={`${serviceType === 'D' ? 'active' : ''}`}
            disabled={loading || cartLoading}
            onClick={() => setServiceType('D')}>
            Delivery
          </Button>
          <Button
            className={`${serviceType === 'P' ? 'active' : ''}`}
            disabled={loading || cartLoading}
            onClick={() => setServiceType('P')}>
            Pickup
          </Button>
        </Row>
      </Section>

      <Section>
        <SectionTitle>When?</SectionTitle>
        <Row wrap="wrap" center="center">
          {serviceWindows.map((window, index) =>
            <ServiceWindow
              key={index}
              active={windowCode === window.code}
              loading={loading || cartLoading}
              handleClick={() => setServiceWindow(window.code)}
              window={window}
            />
          )}
        </Row>
      </Section>

      <Section>
        { loading ?
          <div className="gb-ellipsis">
            <div></div><div></div><div></div><div></div>
          </div> :

          <React.Fragment>
            <Button
              className="primary"
              onClick={handleContinue}
              disabled={checkoutDisabled}
              primary>
              Checkout
            </Button>

            {checkoutDisabled ? <small>Select pickup and delivery options above to checkout</small> : ''}
          </React.Fragment>
        }
      </Section>
    </Container>
  )
}