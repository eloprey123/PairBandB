import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, from } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User } from './user.model';
import { Plugins } from '@capacitor/core'
export interface AuthResponseData {
  kind: string;
  idToken: string;
  email: string;
  refreshToken: string;
  localId: string;
  expiresIn: string;
  registered?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  // Observable which returns only the latest value
  private _user = new BehaviorSubject<User>(null);
  private activeLoginTimer: any;
  
  get userIsAuthenticated() {
    return this._user.asObservable().pipe(
      map(user => {
        if (user) {
          return !!user.token;
        } else {
          return false;
        }  
      })
    );
  }

  get userId() {
    return this._user.asObservable().pipe(
      map(user => {
        if (user) {
          return user.id;
        } else {
          return null;
        }
      })
    );
  }

  get token() {
    return this._user.asObservable().pipe(
      map(user => {
        if (user) {
          return user.token;
        } else {
          return null;
        }
      })
    );
  }
  constructor(private http: HttpClient) { }

  autoLogin() {
    // obtain authentication info from app storage
    return from(Plugins.Storage.get({ key: 'authData' }))
      .pipe(
        map(storeData => {
          if (!storeData || !storeData.value) {
            return null;
          }
          const parsedData = JSON.parse(storeData.value) as { 
            token: string; tokenExpirationDate: string; userId: string; email: string;
          };
          const expirationTime = new Date(parsedData.tokenExpirationDate);
          if (expirationTime <= new Date()) {
            return null;
          }
          const user = new User(
            parsedData.userId,
            parsedData.email,
            parsedData.token,
            expirationTime
          );
          return user;
        }),
        tap(user => {
          if (user) {
            this._user.next(user);
            this.autoLogout(user.tokenDuration);
          }
        }),
        map(user => {
          return !!user;
        })
      );
  }
  
  signup(email: string, password: string) {
    return this.http.post<AuthResponseData>(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${environment.firebaseAPIKey}`,
      { email: email, password: password, returnSecureToken: true }
    ).pipe(tap(this.setUserData.bind(this)));
  }
  
  login(email: string, password: string) {
    return this.http.post<AuthResponseData>(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${environment.firebaseAPIKey}`,
      { email: email, password: password, returnSecureToken: true }
    ).pipe(tap(this.setUserData.bind(this)));
  }

  logout() {
    // renew authentication count down
    if (this.activeLoginTimer) {
      clearTimeout(this.activeLoginTimer);
    }

    this._user.next(null);
    Plugins.Storage.remove({ key: 'authData' });
  }

  // app closed down
  ngOnDestroy() {
    if (this.activeLoginTimer) {
      clearTimeout(this.activeLoginTimer);
    }
  }

  private autoLogout(duration: number) {
    if (this.activeLoginTimer) {
      clearTimeout(this.activeLoginTimer);
    }
    
    this.activeLoginTimer = setTimeout(() => {
      this.logout();
    }, duration);
  }

  private setUserData(userData: AuthResponseData) {
    const expirationTime = new Date(new Date().getTime() + (+userData.expiresIn*1000));
    const user = new User(
      userData.localId, 
      userData.email, 
      userData.idToken, 
      expirationTime
    );
    this._user.next(user);
    this.autoLogout(user.tokenDuration);
    this.storeAuthData(
      userData.localId, 
      userData.idToken, 
      expirationTime.toISOString(), 
      userData.email);
  }

  // store in app storage
  private storeAuthData(
    userId: string,
    token: string,
    tokenExpirationDate: string,
    email: string
  ) {
    const data = JSON.stringify({ 
      userId: userId, 
      token: token, 
      tokenExpirationDate: tokenExpirationDate,
      email: email
    });
    Plugins.Storage.set({ key: 'authData', value: data })    
  }
}
