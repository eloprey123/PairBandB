import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActionSheetController, AlertController, ModalController } from '@ionic/angular';
import { MapModalComponent } from '../../map-modal/map-modal.component';

import { environment } from '../../../../environments/environment'
import { env } from 'process';
import { map, switchMap } from 'rxjs/operators';
import { computeStackId } from '@ionic/angular/directives/navigation/stack-utils';
import { PlaceLocation } from 'src/app/places/location.model';
import { of } from 'rxjs';
import { Capacitor, Plugins } from '@capacitor/core';

@Component({
  selector: 'app-location-picker',
  templateUrl: './location-picker.component.html',
  styleUrls: ['./location-picker.component.scss'],
})
export class LocationPickerComponent implements OnInit {
  @Output() locationPick = new EventEmitter<PlaceLocation>();
  @Input() showPreview = false;
  isLoading = false;
  selectedLocationImage: string;

  constructor( private modalCtrl: ModalController,
    private http: HttpClient,
    private actionSheetCtrl: ActionSheetController,
    private alertCtrl: AlertController) { }

  ngOnInit() {}

  onPickLocation() {
    this.actionSheetCtrl.create({
      header: 'Please Choose', 
      buttons: [
        {text: 'Auto-Locate', handler: () => {
          this.locateUser();
        }},
        {text: 'Pick on Map', handler: () => {
          this.openMap();
        }},
        {text: 'Cancel', role: 'cancel'}
      ]
    })
    .then(actionSheetEl => {
      actionSheetEl.present();
    });
    
  }

  private locateUser() {
    if (!Capacitor.isPluginAvailable('Geolocation')) {
      this.showErrorAlert();
      return;
    } 
    this.isLoading = true;
    Plugins.Geolocation.getCurrentPosition().then(geoPosition => {
      const coordinates = {latitude: geoPosition.coords.latitude,
        longitude: geoPosition.coords.longitude,
        accuracy: null,
        altitude: null,
        altitudeAccuracy: null,
        speed: null,
        heading: null};
        this.createPlace(coordinates.latitude, coordinates.longitude);
        this.isLoading = false;
    }).catch(err => {
      this.isLoading = false;
      this.showErrorAlert();
    });
  }

  private showErrorAlert() {
    this.alertCtrl.create(
      {header: 'Could not fetch location',
       message: 'Please use the map to pick a location!',
       buttons: ['Okay']
      }
    ).then(alertEl => {
      alertEl.present();
    });
  }

  private openMap() {
    this.modalCtrl.create({component: MapModalComponent}).then(modalEl => {
      modalEl.onDidDismiss().then(modalData => {
        if (!modalData.data) {
          return;
        }
        const coordinates = {
          latitude: modalData.data.lat,
          longitude: modalData.data.lng,
          accuracy: null,
          altitude: null,
          altitudeAccuracy: null,
          speed: null,
          heading: null
        };
        this.createPlace(coordinates.latitude, coordinates.longitude);
      });
      modalEl.present();
    });
  }

  private createPlace(lat: number, lng: number) {
    const pickedLocation: PlaceLocation = {
      lat: lat,
      lng: lng,
      address: null,
      staticMapImageUrl: null
    };
    this.isLoading = true;
        this.getAddress(lat, lng).pipe(switchMap(address => {
          pickedLocation.address = address;
          return of(this.getMapImage(pickedLocation.lat, pickedLocation.lng, 14));
        })).subscribe(staticMapImageUrl => {
          pickedLocation.staticMapImageUrl = staticMapImageUrl;
          this.selectedLocationImage = staticMapImageUrl;
          this.isLoading = false;
          this.locationPick.emit(pickedLocation);
        });
  }

  private getAddress(lat: number, lng: number) {
    return this.http.get(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${
        environment.googleMapsAPIKey
      }`
    ).pipe(map((geoData: any) => {
      if (!geoData || !geoData.results || geoData.results.length === 0) {
        return null;
      }
      return geoData.results[0].formatted_address;
    }));
  }

  private getMapImage(lat: number, lng: number, zoom: number) {
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=500x300&maptype=roadmap
    &markers=color:red%7Clabel:Place%7C${lat},${lng}&key=${environment.googleMapsAPIKey}`;
  }
}
