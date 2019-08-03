/**
 * PWA service worker.
 */

function postReview(review) {
fetch(URL, {
  method: 'POST',
  headers: {
    'Content-type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify({
    author: review.author,
    review
  }),

})
.then(res => {
  console.log('Review sent: ', res);
  // maybe update the UI
})
}


if ('serviceWorker' in navigator) {
  // register sw
  navigator.serviceWorker.register('/sw.js')
  .then(registration => {
    
    // console.log('[Sw Registered in resto_info..]', navigator.serviceWorker.ready);
  });
}

// handle review form

const requiredMessage = document.querySelector('#required-message');
requiredMessage.setAttribute('style', 'visibility: hidden');

const form = document.querySelector('#review-form');

form.addEventListener('submit', function(event) {
  event.preventDefault();

  const name = document.querySelector('#reviewer');
  const rating = document.querySelector('#rating');
  const comments = document.querySelector('#comments');

  const review = {
    id: new Date().toISOString(),
    date: new Date().toLocaleDateString(),
    name: name.value,
    rating: rating.value,
    comments: comments.value,
    restaurant_id: getParameterByName('id'),
  };

  function registerSync(sw, reviews) {
    return sw.sync.register('sync-reviews')
    .then(() => {
      // clear the form data
      requiredMessage.setAttribute('style', 'visibility: hidden');
      name.value = '';
      rating.value = '';
      comments.value = '';

      // render restaurant reviews
      fillReviewsHTML(reviews)
    })
    .catch(err => console.log('[INDEXEDDB] saving posts failed!', err))
  }

  if ('SyncManager' in window) {
    // console.log('[SW Ready...]', navigator.serviceWorker);
    // https://github.com/w3c/ServiceWorker/issues/1278
    // https://github.com/w3c/ServiceWorker/issues/1198
    // https://stackoverflow.com/questions/40161452/service-worker-controllerchange-never-fires

    navigator.serviceWorker.ready
    .then(sw => {

      if (!(name.value && rating.value && comments.value)) {
        // console.log('[INVALID ENTRIES]');
        showRequiredMessage = true;
        requiredMessage.setAttribute('style', 'visibility: visible');
        return;
      }
      DBHelper.saveToSyncStore('review', review, reviews => {
        registerSync(sw, reviews);
      })
       
    })
  } else {
    //sendData(); // for older browsers
    console.log('old browser');
    // DBHelper.postReview(review); // not tested
  }
});
/**
* end service worker.
*/

let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.log('[FETCH REST FROM URL]', error)
        // console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  // console.log('[RESTAURANT FROM RESTAURANT_INFO]', restaurant);

  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.alt = `${restaurant.name} image`;
  image.src = DBHelper.imageUrlForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  DBHelper.fetchRestaurantReviews(restaurant.id, fillReviewsHTML)
  // fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  // console.log('[REVIEWS FROMRESTAURANT_INFO]', reviews);
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  ul.role = "listbox"
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.role = "listitem";
  const reviewer = document.createElement('div');
  reviewer.className = 'reviewer'
  const name = document.createElement('p');
  name.innerHTML = review.name;
  reviewer.appendChild(name);
  // li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.date;
  reviewer.appendChild(date);
  // li.appendChild(date);

  li.appendChild(reviewer);

  const reviewValue = document.createElement('div');
  reviewValue.className = 'reviewValue';
  const rating = document.createElement('p');
  rating.className = 'ratingValue'
  rating.innerHTML = `<span aria-roledescription="restaurant rating">Rating: ${review.rating}</span>`;
  reviewValue.appendChild(rating);
  // li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  reviewValue.appendChild(comments);
  // li.appendChild(comments);
  li.appendChild(reviewValue);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.role = 'listitem';
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
