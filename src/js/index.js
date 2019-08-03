'use strict';(function(){function toArray(arr){return Array.prototype.slice.call(arr)}
function promisifyRequest(request){return new Promise(function(resolve,reject){request.onsuccess=function(){resolve(request.result)};request.onerror=function(){reject(request.error)}})}
function promisifyRequestCall(obj,method,args){var request;var p=new Promise(function(resolve,reject){request=obj[method].apply(obj,args);promisifyRequest(request).then(resolve,reject)});p.request=request;return p}
function promisifyCursorRequestCall(obj,method,args){var p=promisifyRequestCall(obj,method,args);return p.then(function(value){if(!value)return;return new Cursor(value,p.request)})}
function proxyProperties(ProxyClass,targetProp,properties){properties.forEach(function(prop){Object.defineProperty(ProxyClass.prototype,prop,{get:function(){return this[targetProp][prop]},set:function(val){this[targetProp][prop]=val}})})}
function proxyRequestMethods(ProxyClass,targetProp,Constructor,properties){properties.forEach(function(prop){if(!(prop in Constructor.prototype))return;ProxyClass.prototype[prop]=function(){return promisifyRequestCall(this[targetProp],prop,arguments)}})}
function proxyMethods(ProxyClass,targetProp,Constructor,properties){properties.forEach(function(prop){if(!(prop in Constructor.prototype))return;ProxyClass.prototype[prop]=function(){return this[targetProp][prop].apply(this[targetProp],arguments)}})}
function proxyCursorRequestMethods(ProxyClass,targetProp,Constructor,properties){properties.forEach(function(prop){if(!(prop in Constructor.prototype))return;ProxyClass.prototype[prop]=function(){return promisifyCursorRequestCall(this[targetProp],prop,arguments)}})}
function Index(index){this._index=index}
proxyProperties(Index,'_index',['name','keyPath','multiEntry','unique']);proxyRequestMethods(Index,'_index',IDBIndex,['get','getKey','getAll','getAllKeys','count']);proxyCursorRequestMethods(Index,'_index',IDBIndex,['openCursor','openKeyCursor']);function Cursor(cursor,request){this._cursor=cursor;this._request=request}
proxyProperties(Cursor,'_cursor',['direction','key','primaryKey','value']);proxyRequestMethods(Cursor,'_cursor',IDBCursor,['update','delete']);['advance','continue','continuePrimaryKey'].forEach(function(methodName){if(!(methodName in IDBCursor.prototype))return;Cursor.prototype[methodName]=function(){var cursor=this;var args=arguments;return Promise.resolve().then(function(){cursor._cursor[methodName].apply(cursor._cursor,args);return promisifyRequest(cursor._request).then(function(value){if(!value)return;return new Cursor(value,cursor._request)})})}});function ObjectStore(store){this._store=store}
ObjectStore.prototype.createIndex=function(){return new Index(this._store.createIndex.apply(this._store,arguments))};ObjectStore.prototype.index=function(){return new Index(this._store.index.apply(this._store,arguments))};proxyProperties(ObjectStore,'_store',['name','keyPath','indexNames','autoIncrement']);proxyRequestMethods(ObjectStore,'_store',IDBObjectStore,['put','add','delete','clear','get','getAll','getKey','getAllKeys','count']);proxyCursorRequestMethods(ObjectStore,'_store',IDBObjectStore,['openCursor','openKeyCursor']);proxyMethods(ObjectStore,'_store',IDBObjectStore,['deleteIndex']);function Transaction(idbTransaction){this._tx=idbTransaction;this.complete=new Promise(function(resolve,reject){idbTransaction.oncomplete=function(){resolve()};idbTransaction.onerror=function(){reject(idbTransaction.error)};idbTransaction.onabort=function(){reject(idbTransaction.error)}})}
Transaction.prototype.objectStore=function(){return new ObjectStore(this._tx.objectStore.apply(this._tx,arguments))};proxyProperties(Transaction,'_tx',['objectStoreNames','mode']);proxyMethods(Transaction,'_tx',IDBTransaction,['abort']);function UpgradeDB(db,oldVersion,transaction){this._db=db;this.oldVersion=oldVersion;this.transaction=new Transaction(transaction)}
UpgradeDB.prototype.createObjectStore=function(){return new ObjectStore(this._db.createObjectStore.apply(this._db,arguments))};proxyProperties(UpgradeDB,'_db',['name','version','objectStoreNames']);proxyMethods(UpgradeDB,'_db',IDBDatabase,['deleteObjectStore','close']);function DB(db){this._db=db}
DB.prototype.transaction=function(){return new Transaction(this._db.transaction.apply(this._db,arguments))};proxyProperties(DB,'_db',['name','version','objectStoreNames']);proxyMethods(DB,'_db',IDBDatabase,['close']);['openCursor','openKeyCursor'].forEach(function(funcName){[ObjectStore,Index].forEach(function(Constructor){if(!(funcName in Constructor.prototype))return;Constructor.prototype[funcName.replace('open','iterate')]=function(){var args=toArray(arguments);var callback=args[args.length-1];var nativeObject=this._store||this._index;var request=nativeObject[funcName].apply(nativeObject,args.slice(0,-1));request.onsuccess=function(){callback(request.result)}}})});[Index,ObjectStore].forEach(function(Constructor){if(Constructor.prototype.getAll)return;Constructor.prototype.getAll=function(query,count){var instance=this;var items=[];return new Promise(function(resolve){instance.iterateCursor(query,function(cursor){if(!cursor){resolve(items);return}
items.push(cursor.value);if(count!==undefined&&items.length==count){resolve(items);return}
cursor.continue()})})}});var exp={open:function(name,version,upgradeCallback){var p=promisifyRequestCall(indexedDB,'open',[name,version]);var request=p.request;if(request){request.onupgradeneeded=function(event){if(upgradeCallback){upgradeCallback(new UpgradeDB(request.result,event.oldVersion,request.transaction))}}}
return p.then(function(db){return new DB(db)})},delete:function(name){return promisifyRequestCall(indexedDB,'deleteDatabase',[name])}};if(typeof module!=='undefined'){module.exports=exp;module.exports.default=module.exports}
else{self.idb=exp}}())

const DB_NAME='restaurantReviews';const DB_VER=1;const RESTAURANT_STORE='Restaurants';const OpenIDB=createIndexedDB(DB_NAME,DB_VER);function createIndexedDB(dbName,dbVer){return idb.open(dbName,dbVer,function(upgradeDb){if(!upgradeDb.objectStoreNames.contains(RESTAURANT_STORE)){const restaurantStore=upgradeDb.createObjectStore(RESTAURANT_STORE,{keyPath:'id'})}})}
function saveToIndexedDB(openDB,storeName,data){openDB.then(db=>{const transaction=db.transaction(storeName,'readwrite');store=transaction.objectStore(storeName);try{data.forEach(restaurant=>store.put(restaurant))}catch(error){}
return transaction.complete})}
function readFromIndexedDB(openDB,storeName,typeOfData){return openDB.then(db=>db.transaction(storeName).objectStore(storeName).getAll())}
class DBHelper{static get DATABASE_URL(){const port=8081
return `http://localhost:1337/restaurants`}
static async fetchRestaurants(callback){try{const response=await fetch(DBHelper.DATABASE_URL);const restaurants=await response.json();saveToIndexedDB(OpenIDB,RESTAURANT_STORE,restaurants);callback(null,restaurants)}catch(err){const restaurants=await readFromIndexedDB(OpenIDB,RESTAURANT_STORE,'all');callback(null,restaurants);const error=(`Request failed. Returned status of ${err}`);callback(error,null)}}
static fetchRestaurantById(id,callback){DBHelper.fetchRestaurants((error,restaurants)=>{if(error){callback(error,null)}else{const restaurant=restaurants.find(r=>r.id==id);if(restaurant){callback(null,restaurant)}else{callback('Restaurant does not exist',null)}}})}
static fetchRestaurantByCuisine(cuisine,callback){DBHelper.fetchRestaurants((error,restaurants)=>{if(error){callback(error,null)}else{const results=restaurants.filter(r=>r.cuisine_type==cuisine);callback(null,results)}})}
static fetchRestaurantByNeighborhood(neighborhood,callback){DBHelper.fetchRestaurants((error,restaurants)=>{if(error){callback(error,null)}else{const results=restaurants.filter(r=>r.neighborhood==neighborhood);callback(null,results)}})}
static fetchRestaurantByCuisineAndNeighborhood(cuisine,neighborhood,callback){DBHelper.fetchRestaurants((error,restaurants)=>{if(error){callback(error,null)}else{let results=restaurants
if(cuisine!='all'){results=results.filter(r=>r.cuisine_type==cuisine)}
if(neighborhood!='all'){results=results.filter(r=>r.neighborhood==neighborhood)}
callback(null,results)}})}
static fetchNeighborhoods(callback){DBHelper.fetchRestaurants((error,restaurants)=>{if(error){callback(error,null)}else{const neighborhoods=restaurants.map((v,i)=>restaurants[i].neighborhood)
const uniqueNeighborhoods=neighborhoods.filter((v,i)=>neighborhoods.indexOf(v)==i)
callback(null,uniqueNeighborhoods)}})}
static fetchCuisines(callback){DBHelper.fetchRestaurants((error,restaurants)=>{if(error){callback(error,null)}else{const cuisines=restaurants.map((v,i)=>restaurants[i].cuisine_type)
const uniqueCuisines=cuisines.filter((v,i)=>cuisines.indexOf(v)==i)
callback(null,uniqueCuisines)}})}
static urlForRestaurant(restaurant){return(`./restaurant.html?id=${restaurant.id}`)}
static imageUrlForRestaurant(restaurant){if(restaurant.photograph){return `/img/dest/webp/${restaurant.photograph}-md_1x.webp`}
return `/img/dest/webp/not-a-restaurant.webp`}
static mapMarkerForRestaurant(restaurant,map){const marker=new google.maps.Marker({position:restaurant.latlng,title:restaurant.name,url:DBHelper.urlForRestaurant(restaurant),map:map,animation:google.maps.Animation.DROP});return marker}}

if(navigator.serviceWorker){navigator.serviceWorker.register('sw.js').catch(console.error)}
let restaurants,neighborhoods,cuisines
var map
var markers=[]
document.addEventListener('DOMContentLoaded',(event)=>{fetchNeighborhoods();fetchCuisines()});fetchNeighborhoods=()=>{DBHelper.fetchNeighborhoods((error,neighborhoods)=>{if(error){console.error(error)}else{self.neighborhoods=neighborhoods;fillNeighborhoodsHTML()}})}
fillNeighborhoodsHTML=(neighborhoods=self.neighborhoods)=>{const select=document.getElementById('neighborhoods-select');select.role="selection";neighborhoods.forEach(neighborhood=>{const option=document.createElement('option');option.innerHTML=neighborhood;option.value=neighborhood;select.append(option)})}
fetchCuisines=()=>{DBHelper.fetchCuisines((error,cuisines)=>{if(error){console.error(error)}else{self.cuisines=cuisines;fillCuisinesHTML()}})}
fillCuisinesHTML=(cuisines=self.cuisines)=>{const select=document.getElementById('cuisines-select');select.role="selection";cuisines.forEach(cuisine=>{const option=document.createElement('option');option.innerHTML=cuisine;option.value=cuisine;select.append(option)})}
window.initMap=()=>{let loc={lat:40.722216,lng:-73.987501};self.map=new google.maps.Map(document.getElementById('map'),{zoom:12,center:loc,scrollwheel:!1});updateRestaurants()}
updateRestaurants=()=>{const cSelect=document.getElementById('cuisines-select');const nSelect=document.getElementById('neighborhoods-select');const cIndex=cSelect.selectedIndex;const nIndex=nSelect.selectedIndex;const cuisine=cSelect[cIndex].value;const neighborhood=nSelect[nIndex].value;DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine,neighborhood,(error,restaurants)=>{if(error){console.error(error)}else{resetRestaurants(restaurants);fillRestaurantsHTML()}})}
resetRestaurants=(restaurants)=>{self.restaurants=[];const ul=document.getElementById('restaurants-list');ul.innerHTML='';self.markers.forEach(m=>m.setMap(null));self.markers=[];self.restaurants=restaurants}
fillRestaurantsHTML=(restaurants=self.restaurants)=>{const ul=document.getElementById('restaurants-list');ul.role='list';restaurants.forEach(restaurant=>{ul.append(createRestaurantHTML(restaurant))});addMarkersToMap()}
createRestaurantHTML=(restaurant)=>{const li=document.createElement('li');li.role="listitem";li.role="tab";const image=document.createElement('img');image.alt=`${restaurant.name} image`;image.className='restaurant-img';image.src=DBHelper.imageUrlForRestaurant(restaurant);li.append(image);const name=document.createElement('h3');name.innerHTML=restaurant.name;li.append(name);const neighborhood=document.createElement('p');neighborhood.innerHTML=restaurant.neighborhood;li.append(neighborhood);const address=document.createElement('p');address.innerHTML=restaurant.address;li.append(address);const more=document.createElement('a');more.innerHTML='View Details';more.href=DBHelper.urlForRestaurant(restaurant);more.role="button";li.append(more)
return li}
addMarkersToMap=(restaurants=self.restaurants)=>{restaurants.forEach(restaurant=>{const marker=DBHelper.mapMarkerForRestaurant(restaurant,self.map);google.maps.event.addListener(marker,'click',()=>{window.location.href=marker.url});self.markers.push(marker)})}

// if(navigator.serviceWorker){navigator.serviceWorker.register('sw.js').catch(console.error)}
// let restaurant;var map;window.initMap=()=>{fetchRestaurantFromURL((error,restaurant)=>{if(error){console.error(error)}else{self.map=new google.maps.Map(document.getElementById('map'),{zoom:16,center:restaurant.latlng,scrollwheel:!1});fillBreadcrumb();DBHelper.mapMarkerForRestaurant(self.restaurant,self.map)}})}
// fetchRestaurantFromURL=(callback)=>{if(self.restaurant){callback(null,self.restaurant)
// return}
// const id=getParameterByName('id');if(!id){error='No restaurant id in URL'
// callback(error,null)}else{DBHelper.fetchRestaurantById(id,(error,restaurant)=>{self.restaurant=restaurant;if(!restaurant){console.error(error);return}
// fillRestaurantHTML();callback(null,restaurant)})}}
// fillRestaurantHTML=(restaurant=self.restaurant)=>{const name=document.getElementById('restaurant-name');name.innerHTML=restaurant.name;const address=document.getElementById('restaurant-address');address.innerHTML=restaurant.address;const image=document.getElementById('restaurant-img');image.className='restaurant-img';image.alt=`${restaurant.name} image`;image.src=DBHelper.imageUrlForRestaurant(restaurant);const cuisine=document.getElementById('restaurant-cuisine');cuisine.innerHTML=restaurant.cuisine_type;if(restaurant.operating_hours){fillRestaurantHoursHTML()}
// fillReviewsHTML()}
// fillRestaurantHoursHTML=(operatingHours=self.restaurant.operating_hours)=>{const hours=document.getElementById('restaurant-hours');for(let key in operatingHours){const row=document.createElement('tr');const day=document.createElement('td');day.innerHTML=key;row.appendChild(day);const time=document.createElement('td');time.innerHTML=operatingHours[key];row.appendChild(time);hours.appendChild(row)}}
// fillReviewsHTML=(reviews=self.restaurant.reviews)=>{const container=document.getElementById('reviews-container');const title=document.createElement('h3');title.innerHTML='Reviews';container.appendChild(title);if(!reviews){const noReviews=document.createElement('p');noReviews.innerHTML='No reviews yet!';container.appendChild(noReviews);return}
// const ul=document.getElementById('reviews-list');ul.role="listbox"
// reviews.forEach(review=>{ul.appendChild(createReviewHTML(review))});container.appendChild(ul)}
// createReviewHTML=(review)=>{const li=document.createElement('li');li.role="listitem";const reviewer=document.createElement('div');reviewer.className='reviewer'
// const name=document.createElement('p');name.innerHTML=review.name;reviewer.appendChild(name);const date=document.createElement('p');date.innerHTML=review.date;reviewer.appendChild(date);li.appendChild(reviewer);const reviewValue=document.createElement('div');reviewValue.className='reviewValue';const rating=document.createElement('p');rating.className='ratingValue'
// rating.innerHTML=`<span aria-roledescription="restaurant rating">Rating: ${review.rating}</span>`;reviewValue.appendChild(rating);const comments=document.createElement('p');comments.innerHTML=review.comments;reviewValue.appendChild(comments);li.appendChild(reviewValue);return li}
// fillBreadcrumb=(restaurant=self.restaurant)=>{const breadcrumb=document.getElementById('breadcrumb');const li=document.createElement('li');li.innerHTML=restaurant.name;breadcrumb.appendChild(li)}
// getParameterByName=(name,url)=>{if(!url)
// url=window.location.href;name=name.replace(/[\[\]]/g,'\\$&');const regex=new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),results=regex.exec(url);if(!results)
// return null;if(!results[2])
// return'';return decodeURIComponent(results[2].replace(/\+/g,' '))}