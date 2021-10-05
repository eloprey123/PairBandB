import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, AlertController, LoadingController, ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { BookingService } from 'src/app/bookings/booking.service';
import { MapModalComponent } from 'src/app/shared/map-modal/map-modal.component';
import { CreateBookingComponent } from '../../../bookings/create-booking/create-booking.component';
import { Place } from '../../place.model';
import { PlacesService } from '../../places.service';

@Component({
  selector: 'app-place-detail',
  templateUrl: './place-detail.page.html',
  styleUrls: ['./place-detail.page.scss'],
})
export class PlaceDetailPage implements OnInit, OnDestroy {
  place: Place;
  private placeSub: Subscription;
  isBookable = false;
  isLoading = false;

  constructor(private activatedRoute: ActivatedRoute, private placesService: PlacesService,private router: Router,
    private modalCtrl: ModalController,
    private actionSheetCtrl: ActionSheetController,
    private bookingService: BookingService,
    private loadingCtrl: LoadingController,
    private authService: AuthService,
    private alertCtrl: AlertController) { }

  ngOnInit() {
    this.activatedRoute.paramMap.subscribe(paramMap => {
      if (!paramMap.has('placeId')) {
        this.router.navigateByUrl('/places/tabs/discover');
        return;
      }
      this.isLoading = true;
      let fetchedUserId: string;
      this.authService.userId.pipe(take(1), switchMap(userId => {
        if (!userId) {
          throw new Error('Found no user ID');
        }
        fetchedUserId = userId;
        return this.placesService
        .getPlace(paramMap.get('placeId'));
      })
      )
      .subscribe(place => {
        this.place = place;
        this.isBookable = place.userId !== fetchedUserId;
        console.log("Bookable: " + this.isBookable);
        this.isLoading = false;
      },
      error => {
        this.alertCtrl
          .create({
            header: 'An error ocurred!',
            message: 'Could not load place.',
            buttons: [
              {
                text: 'Okay',
                handler: () => {
                  this.router.navigate(['/places/tabs/discover']);
                }
              }
            ]
          })
          .then(alertEl => alertEl.present());
      });
    })
  }

  onBookPlace() {
    //this.router.navigateByUrl('/places/tabs/discover');
    this.actionSheetCtrl.create({
      header: 'Choose an Action',
      buttons: [
        {
          text: 'Select Date',
          handler: () => {
            this.openBookingModal('select');
          }
        },
        {
          text: 'Random Date',
          handler: () => {
            this.openBookingModal('random');
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    }).then(actionSheetEl => {
      actionSheetEl.present();
    });
    
  }

  openBookingModal(mode: 'select' | 'random') {
    console.log(mode);
    this.modalCtrl.
    create({component: CreateBookingComponent, 
      componentProps: { selectedPlace: this.place, selectMode: mode}})
    .then(modalEl => {
      modalEl.present();
      return modalEl.onDidDismiss();
    })
    .then(resData => {
      console.log(resData.data, resData.role);
      if (resData.role === 'confirm') {
        this.loadingCtrl.create({message: 'Booking Place. . .'}).then(loadingEl => {
          loadingEl.present();
          const data = resData.data.bookingData;
          this.bookingService.addBooking(
            this.place.id,
            this.place.title,
            this.place.imageUr,
            data.firstName,
            data.lastName,
            data.guestNumber,
            data.startDate,
            data.endDate
          ).subscribe(() => {
            loadingEl.dismiss();
          });
        });
        
      }
    });
  }

  onShowFullMap() {
    this.modalCtrl.create({ component: MapModalComponent, componentProps: {
      center: { lat: this.place.location.lat, lng: this.place.location.lng},
      selectable: false,
      closeButtonText: 'Close',
      title: this.place.location.address
    } })
    .then(modalEl => {
      modalEl.present();
    })
  }

  ngOnDestroy() {
    if (this.placeSub) {
      this.placeSub.unsubscribe();
    }
  }
}
