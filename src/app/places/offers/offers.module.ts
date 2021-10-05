import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';


import { OffersPage } from './offers.page';
import { OfferItemComponent } from './offer-item/offer-item.component';
import { PlacesPageRoutingModule } from '../places-routing.module';
import { OffersPageRoutingModule } from './offers-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OffersPageRoutingModule
  ],
  declarations: [OffersPage, OfferItemComponent]
})
export class OffersPageModule {}
