import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { provideHttpClient  } from '@angular/common/http';

// Firebase
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { environment } from 'src/environments/environment';
import { FormsModule } from '@angular/forms';
import { LoginComponent } from './components/login/login.component';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { RouterModule } from '@angular/router';


@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent
  ],
  imports: [
    BrowserModule,
    RouterModule,
    AppRoutingModule,
    RouterModule.forRoot([]),
  ],

  providers: [provideHttpClient(),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)), 
    provideAuth(() => getAuth()) 
  ],
  
  bootstrap: [AppComponent]
})
export class AppModule { }

