import { Injectable } from '@angular/core';
import { BehaviorSubject, from, of} from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Place } from './place.model';
import { take, map, tap, delay, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { PlaceLocation } from './location.model';

/*[
  new Place(
    'p1', 
    'Manhattan Mansion', 
    'In the heart of New York City',
    'https://imgs.6sqft.com/wp-content/uploads/2014/06/21042533/Carnegie-Mansion-nyc.jpg',
    149.99,
    new Date('2021-01-01'),
    new Date('2021-12-31'),
    'abc'
  ),
  new Place(
    'p2',
    'L\'amour Toujours',
    'A romantic place in Paris!',
    'https://www.parisinsidersguide.com/image-files/sully-hotel-marais-google-800-2x1.jpg',
    189.99,
    new Date('2021-01-01'),
    new Date('2021-12-31'),
    'abc'
  ),
  new Place(
    'p3',
    'The Foggy Palace',
    'Not your average city trip',
    'https://i.pinimg.com/originals/9c/88/44/9c8844b217bdb6c17db14f51ad2e51a5.jpg',
    99.99,
    new Date('2021-01-01'),
    new Date('2021-12-31'),
    'abc'
  )
]*/

interface PlaceData {
  availableFrom: string;
  availableTo: string;
  description: string;
  imageUr: string;
  price: number;
  title: string;
​​  userId: string;
  location: PlaceLocation;
}

@Injectable({
  providedIn: 'root'
})


export class PlacesService {
  private _places = new BehaviorSubject<Place[]>([]);

  get places() {
    return this._places.asObservable();
  }

  fetchPlaces() {
    return this.authService.token.pipe(
      take(1),
      switchMap(token => {
      return this.http
        .get<{ [key: string]: PlaceData }>(
          `https://your-realtime-database.firebaseio.com/offered-places.json?auth=${token}`
        )
      }),
      map(resData => {
        const places = [];
        for (const key in resData) {
          if (resData.hasOwnProperty(key)) {
            places.push(new Place(
              key, 
              resData[key].title,
              resData[key].description,
              resData[key].imageUr,
              resData[key].price,
              new Date(resData[key].availableFrom),
              new Date(resData[key].availableTo),
              resData[key].userId,
              resData[key].location
            ));
          }
        }
        return places;
      }),
      tap(places => {
        this._places.next(places);
      })
    );
  }

  getPlace(id: string) {
    return this.authService.token.pipe(
      take(1),
      switchMap(token => {
        return this.http.get<PlaceData>(
          `https://your-realtime-database.firebaseio.com/offered-places/${id}.json?auth=${token}`
        )
      }),
      map(placeData => {
        return new Place(
          id,
          placeData.title,
          placeData.description,
          placeData.imageUr,
          placeData.price,
          new Date(placeData.availableFrom),
          new Date(placeData.availableTo),
          placeData.userId,
          placeData.location
        );
      })
    );
  }

  uploadImage(image: File) {
    const uploadData = new FormData();
    uploadData.append('image', image);

    return this.authService.token.pipe(
      take(1),
      switchMap(token => {
        return this.http.post<{imageUrl: string, imagePath: string}>(
          'https://us-central1-your-realtime-database.cloudfunctions.net/storeImage', 
          uploadData,
          { headers: { Authorization: 'Bearer ' + token }}
        );
      })
    );

  }

  addPlace(title: string, description: string, price: number, dateFrom: Date, dateTo: Date, location: PlaceLocation, imageUrl: string) {
    let generatedId: string;
    let newPlace: Place;
    let fetchedUserId: string;
    return this.authService.userId.pipe(
      take(1), 
      switchMap(userId => {
        fetchedUserId = userId;
        return this.authService.token;
      }),
      take(1),
      switchMap(token => {
        if (!fetchedUserId) {
          throw new Error('No user found!');
        }
        newPlace = new Place(
          Math.random().toString(), 
          title, 
          description, 
          imageUrl, 
          price, 
          dateFrom, 
          dateTo,
          fetchedUserId,
          location);
        return this.http.post<{name: string}>(
          `https://your-realtime-database.firebaseio.com/offered-places.json?auth=${token}`, 
          { ...newPlace, id: null})
      }),
      switchMap(resData => {
        generatedId = resData.name;
        return this.places;
      }),
      take(1),
      tap(places => {
        newPlace.id = generatedId;
        this._places.next(places.concat(newPlace));
      })); 
    /*return this.places.pipe(take(1), delay(1000), tap(places => {
        this._places.next(places.concat(newPlace));    
      })
    );*/
  }

  updatePlace(placeID: string, title: string, description: string) {
    let updatedPlaces: Place[];
    let fetchedToken: string;

    return this.authService.token.pipe(
      take(1),
      switchMap(token => {
        fetchedToken = token;
        return this.places;
      }),
      take(1),
      switchMap(places => {
        if (!places || places.length <= 0) {
          return this.fetchPlaces();
        } else {
          return of(places);
        }
      }),
      switchMap(places => {
        const updatedPlaceIndex = places.findIndex(pl => pl.id === placeID);
        updatedPlaces = [...places];
        const oldPlace = updatedPlaces[updatedPlaceIndex];
        updatedPlaces[updatedPlaceIndex] = new Place(
          oldPlace.id, 
          title, description, 
          oldPlace.imageUr, 
          oldPlace.price, 
          oldPlace.availableFrom, 
          oldPlace.availableTo, 
          oldPlace.userId,
          oldPlace.location
        );
        return this.http.put(
          `https://your-realtime-database.firebaseio.com/offered-places/${placeID}.json?auth=${fetchedToken}`,
          { ...updatedPlaces[updatedPlaceIndex], id: null }
        );
      }),
      tap(()=> {
        this._places.next(updatedPlaces);
      })
    );
    
  }
  
  constructor(private authService: AuthService, private http: HttpClient) { }
}
