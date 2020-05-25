const Container = window.styled.div`
  max-width: 750px;
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
  padding: 1rem 1.5rem;
  font-size: 1.2rem;
  cursor: pointer;
  ${props => props.primary ?
    `background: black;
     color: white;` : ''
  }
`

const Row = window.styled.div`
  display: flex;
`
const ServiceType = window.styled.button`
  opacity: ${props => props.active ? '1' : '0.8rem'};
  ${props => props.active ? 'background: black;' : ''}
  ${props => props.active ?  'color: white;' : ''}
  flex: 1;
  margin: 0;
  border: 1px solid black;
  text-align: center;
  max-width: 15rem;
  padding: 1rem;
  font-size: 1.2rem;

  &:disabled {
    color: grey;
  }
`
const ServiceWindow = window.styled.button`
  padding: 1rem;
  text-align: center;
  border: 1px solid;
  margin: 1rem;
  cursor: pointer;
  opacity: 0.5;
  transition: 100ms all ease-in-out;
  ${props => props.active ? `
  transform: scale(1.2);
  opacity: 1;` :''}

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    color: grey;
  }
`

function GrocerBoxComponent({ config }) {
  const [availableWindows, setAvailableWindows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [serviceWindows, setServiceWindows] = React.useState([]);
  const [product, setProduct] = React.useState();
  const [cart, setCart] = React.useState();
  const [gbItem, setGbItem] = React.useState();
  const [cartLoading, setCartLoading] = React.useState(false);

  const init = () => {
    CartJS.getCart().then(res => {
      setCart(res);

      getAvailableWindows().then((windows) => {
        setAvailableWindows(windows);
        setGrocerBoxItem(res.items, windows);
        setRefundableItem(res.items);
      });
    });
  }

  React.useEffect(() => {
    init();

    $(document).on('cart.ready', (event, c) => {
      console.log({ event, c })
    });

    $(document).on('cart.requestStarted', (event, c) => {
      console.log({ event, c })
      setCartLoading(true);
    });

    $(document).on('cart.requestComplete', (event, c) => {
      console.log({ event, c })
      setCartLoading(false);
      setCart({ ...c });
    });
  }, []);

  React.useEffect(() => {
    if (cart) {
      const item = cart.items.find(item => item.handle === config.grocerbox_product);
      console.log({ cart, item })
      setGbItem({ ...item })
    }
  }, [cart]);

  React.useEffect(() => {
    console.log({ product })
  }, [product]);

  React.useEffect(() => {
    generateServiceWindows()
  }, [availableWindows])

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
          const [serviceType, code] = atob(grocerBoxItem.properties.code).split(':');
          const windowIsAvailable = availableWindows.find(w => w.code === code);
          if (!windowIsAvailable) {
            setVariant(firstVariant);
          }
        }
      });
  }
  const setRefundableItem = (items) => {
    if (!items.find(item => item.handle === config.refundable_hold_product)) {
      getProduct(config.refundable_hold_product).then(product => {
        if (product && product.variants.length) {
          CartJS.addItem(product.variants[0].id, 1, {}, {
            error: (error) => handleError(`Error adding Refundable Hold: ${error}`)
          });
        }
      });
    }
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

  const refundableItem = cart ? cart.items.find(item => item.handle === config.refundable_hold_product) : null;

  const windowCode = gbItem && gbItem.properties && gbItem.properties.code ? atob(gbItem.properties.code).split(':')[1] : null;
  const serviceType = gbItem && gbItem.variant_options ? gbItem.variant_options[0] : null;

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
    document.getElementById("gb-cart-btn").click();
  }

  return (
    <Container>
      <Section>
        <SectionTitle>Would you like pickup or delivery?</SectionTitle>

        <Row>
          <ServiceType active={serviceType === 'D' } disabled={loading} onClick={() => setServiceType('D')}>Delivery</ServiceType>
          <ServiceType active={serviceType === 'P' } disabled={loading} onClick={() => setServiceType('P')}>Pickup</ServiceType>
        </Row>
      </Section>

      <Section>
        <SectionTitle>When?</SectionTitle>
        <Row>
          {serviceWindows.map((window, index) =>
            <ServiceWindow
              key={index}
              active={windowCode === window.code}
              disabled={loading}
              onClick={() => setServiceWindow(window.code)}>
              <span>{window.day}</span>
              <p>{window.date}</p>
              <span>{window.name}</span>
            </ServiceWindow>
          )}
        </Row>
      </Section>

      <Section>
        { loading ?
          <div className="gb-ellipsis">
            <div></div><div></div><div></div><div></div>
          </div> :
          <Button onClick={handleContinue} primary>Continue</Button>
        }
      </Section>
    </Container>
  )
}