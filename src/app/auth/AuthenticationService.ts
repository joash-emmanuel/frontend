import { Injectable, OnInit } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpErrorResponse } from "@angular/common/http";
import { Principal } from "./Principal";
import { LibHttp } from '../lib/http/LibHttp';
import { PrincipalWrapper } from './PrincipalWrapper';
import { User } from '../userModule/components/user/User';
import { ShopperService } from '../userModule/components/shopper/ShopperService';

@Injectable({
    providedIn: 'root'
})
export class AuthenticationService {
    public token: string = "";
    public principal: BehaviorSubject<Principal | boolean | null> = new BehaviorSubject<Principal | boolean | null>(null);
    public user: BehaviorSubject<User | boolean | null> = new BehaviorSubject<User | boolean | null>(null);

    constructor(
        private libHttp: LibHttp,
        private shopperService: ShopperService
    ) {

        this.refresh();
    }

    refresh() {
        this.serverUser().subscribe({
            next: user => {
                console.log('user', user);
                this.user.next(user);
            },
            error: error => {
                this.user.next(false);
            }
        });
        this.serverPrincipal().subscribe({
            next: principal => {
                this.principal.next(principal.principal);

            },
            error: error => {
                this.principal.next(false)
            }
        });
    }

    serverUser(): Observable<User> {
        return this.libHttp.get('/shopper');
    }

    serverPrincipal(): Observable<PrincipalWrapper> {
        return this.libHttp.get("/principal");
    }

    healthCheck(): Observable<any> {
        return this.libHttp.get("/actuator/health");
    }

    login(username: string, password: string): Observable<User | boolean> {

        return new Observable(observer => {

            let credentials = new URLSearchParams();
            credentials.set("username", username);
            credentials.set("password", password);

            this.libHttp.postForm(
                '/login',
                credentials.toString()
            )
                .subscribe({
                    next: (principal: Principal) => {

                        this.principal.next(principal);

                        this.serverUser().subscribe({
                            next: (user: User) => {
                                this.user.next(user);
                                observer.next(user);
                            },
                            error: error => {
                                console.log('authentication service login server user error', error);
                                this.user.next(false);
                                observer.next(false);
                            }
                        });
                    }
                    , error: (error: HttpErrorResponse) => {

                        console.log('authentication service error ', error);
                        this.user.next(false);
                        this.principal.next(false);
                        observer.next(false);
                    }
                });
        });
    }

    logout(): Observable<boolean> {
        return new Observable(observer => {

            this.libHttp.post("/logout", {})
                .subscribe(
                    {
                        next: response => {

                            this.principal.next(new Principal());
                            this.user.next(false);
                            observer.next(true);
                        },
                        error: error => {

                            observer.next(false);
                        }
                    }
                );
        });
    }
}