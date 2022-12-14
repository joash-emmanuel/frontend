import { Component, OnInit, HostListener } from '@angular/core';
import { NgbActiveModal, NgbModal, NgbModalRef } from "@ng-bootstrap/ng-bootstrap";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { combineLatestWith } from "rxjs";
import { ConfigService } from "src/app/config/ConfigService";
import { AdminBirthdayActivityService } from "../admin/birthdayActivity/AdminBirthdayActivityService";
import { BirthdayActivity } from "../admin/birthdayActivity/BirthdayActivity";
import { AdminShopperConnectionValueService } from "../admin/connectionvalues/AdminShopperConnectionValueService";
import { ShopperConnectionValue } from "../admin/connectionvalues/ShopperConnectionValue";
import { AdminLogStoryService } from "../admin/logstory/AdminLogStoryService";
import { LogStory } from "../admin/logstory/LogStory";
import { LoginModalComponent } from "../loginModal/LoginModalComponent";
import { Log } from "../logs/Log";
import { LogImageService } from "../logs/LogImageService";
import { LogPost } from "../logs/LogPost";
import { LogPostService } from "../logs/LogPostService";
import { Shopper } from "../shopper/Shopper";
import { ShopperService } from "../shopper/ShopperService";
import { ShopperConnectionRequestService } from "../shopperconnectionrequest/ShopperConnectionRequestService";
import { WalletService } from "../wallet/WalletService";
import { AcceptInvitationService } from '../acceptInvitationModal/AcceptInvitationService';
import { ShopperConnectionService } from '../shopperconnection/ShopperConnectionService';
import { HotToastService } from "@ngneat/hot-toast";

@Component({
  selector: 'app-accept-invitation',
  templateUrl: './accept-invitation.component.html',
  styleUrls: ['./accept-invitation.component.css']
})
export class AcceptInvitationComponent implements OnInit {
  private modalRef: NgbModalRef | null = null;

  codeVerificationForm = new FormGroup({
    verificationCode: new FormControl('', [Validators.required])
  });

  verifyEmailForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    otp: new FormControl('', [Validators.required])
  });

  shopperDetailsForm = new FormGroup({
    firstName: new FormControl('', [Validators.required]),
    lastName: new FormControl('', [Validators.required]),
    gender: new FormControl('', [Validators.required])
  });

  errorMessage = "";
  code = "";
  verificationEmail = "";
  hide = true;
  step = 1;
  inviter!: Shopper;
  customLogStory: string = "";
  showCustomLogStory: boolean = false;
  passwordMismatch: boolean = false;
  shopperConnectionValues: ShopperConnectionValue[] = [];
  birthDate: string = "";// NgbDate = new NgbDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDay());
  dateNow = new Date();
  currentYear = this.dateNow.getUTCFullYear();
  displayedProfilPic = "";
  innerWidth: any;

  shopper: Shopper = new Shopper();
  acceptedTermsAndConditions: boolean = false;

  logStories: LogStory[] = [];

  thankInviterMessages: string[] = [
    "I appreciate your consideration",
    "Thank you for the invite",
    "Thank you for letting me in your log group can't wait!",
    "Girl, here we go! Thank you for accepting my request."
  ];

  constructor(
    private toast: HotToastService,
    private shopperService: ShopperService,
    private adminLogStoryService: AdminLogStoryService,
    private logPostService: LogPostService,
    private adminShopperConnectionValueService: AdminShopperConnectionValueService,
    private adminBithdayActivityService: AdminBirthdayActivityService,
    private shopperConnectionRequestService: ShopperConnectionRequestService,
    private modalService: NgbModal,
    private logImageService: LogImageService,
    public configService: ConfigService,
    private walletService: WalletService,
    public activeModal: NgbActiveModal,
    private service: AcceptInvitationService,
    private shopperConnectionService: ShopperConnectionService,
  ) { }

  ngOnInit(): void {
    this.innerWidth = window.innerWidth;
  }

  ngAfterViewInit(): void {
    this.adminLogStoryService.list().subscribe(list => this.logStories = list);
    this.adminShopperConnectionValueService.list().subscribe(list => this.shopperConnectionValues = list);
    this.adminBithdayActivityService.list().subscribe(list => this.birthdayActivities = list);
  }

  get verificationCode() {
    return this.codeVerificationForm.get('verificationCode');
  }

  get email() {
    return this.verifyEmailForm.get('email');
  }

  get firstName() {
    return this.shopperDetailsForm.get('firstName');
  }

  get lastName() {
    return this.shopperDetailsForm.get('lastName');
  }

  get gender() {
    return this.shopperDetailsForm.get('gender');
  }

  get otp() {
    return this.verifyEmailForm.get('otp');
  }

  nextStep() {
    this.step++;
  }

  verifyCode() {
    const { verificationCode } = this.codeVerificationForm.value;

    if (!this.codeVerificationForm.valid || !verificationCode) {
      this.verificationCode?.setErrors({ "required": true });
      this.verificationCode?.markAsTouched();
      return;
    }

    this.code = verificationCode;

    this.service.verifyCode(verificationCode)
      .subscribe(
        {
          next: (response: Shopper) => {
            this.step++;
            this.inviter = response;

          },
          error: (error) => { }
        }
      );
  }

  verifyEmail() {
    const { email, otp } = this.verifyEmailForm.value;

    if (!email || !this.email?.valid) {
      this.email?.setErrors({ "required": true });
      this.email?.setErrors({ "email": true });
      this.email?.markAsTouched();
      return;
    }

    this.verificationEmail = email;

    this.service.verifyEmail({ code: this.code, email: email }).pipe(
      this.toast.observe({
        success: 'OTP Sent',
        loading: 'Sending OTP...',
        error: ({ message }) => `There was an error: ${message} `,
      })
    )
      .subscribe();
  }

  verifyOTP() {
    const { email, otp } = this.verifyEmailForm.value;

    if (!otp || !this.otp?.valid) {
      this.otp?.setErrors({ "required": true });
      this.otp?.markAllAsTouched();
      return;
    }

    this.service.verifyOTP({ code: this.code, email: this.verificationEmail, otp: otp })
      .subscribe((response) => {
        if (response) {
          this.step++;
        }
        this.shopper = response;
      });
  }

  confirmPictureUpload() {
    if (!this.shopper.profilePicUrl) {
      this.toast.error('profile picture is required', { autoClose: false, dismissible: true });
      return;
    }

    this.nextStep();
  }

  saveBirthday() {
    console.log('birthdate ', this.birthDate);
    let dob = Date.parse(this.birthDate);
    let dbDate = new Date(dob);
    console.log("dbDate", dbDate);
    if (!dbDate) {
      this.toast.error('enter valid date', { autoClose: false, dismissible: true });
      return;
    }
    if (dbDate.getFullYear() > (this.currentYear - 16) || dbDate.getFullYear() < (this.currentYear - 100)) {
      this.toast.error('age limit is 16', { autoClose: false, dismissible: true });
      return;
    }
    this.birthDate = dbDate.getFullYear() + "-" + (dbDate.getMonth() + 1) + "-" + dbDate.getDate(); //this.birthDate.year + "-" + this.birthDate.month + "-" + this.birthDate.day;
    console.log('shopper.dob', this.shopper.dob);
    this.step++;
  }

  logPost: LogPost = new LogPost();

  selectLogStory(logStory: LogStory) {

    let log: Log = new Log();
    log.shopper = this.shopper;

    let logPost: LogPost = new LogPost();
    logPost.text = logStory.text;
    logPost.log = log;

    this.logPostService.save(logPost)
      .subscribe(response => {
        this.logPost = response;
        this.step++;
      });
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.innerWidth = window.innerWidth;
  }

  profilePicFileChange(event: any) {

    if (event.target.files.length > 0) {
      this.shopperService.uploadProfilePic(this.shopper.id, event.target.files[0]).pipe(
        this.toast.observe({
          success: 'Profile picture uploaded',
          loading: 'Uploading ...',
          error: ({ message }) => `There was an error: ${message} `,
        })
      )
        .subscribe({
          next: response => { this.shopper = response },
          error: error => { },
          complete: () => {
            const pictures = JSON.parse(this.shopper.profilePicUrl);
            if (this.innerWidth <= 400) {
              this.displayedProfilPic = pictures.small;
            } else if (this.innerWidth <= 768 && this.innerWidth > 400) {
              this.displayedProfilPic = pictures.medium;
            } else if (this.innerWidth > 768) {
              this.displayedProfilPic = pictures.large;
            }
          }
        });
    }
  }

  customizeLogStory() {
    this.showCustomLogStory = true;
  }

  submitCustomLogStory() {
    let log: Log = new Log();
    log.shopper = this.shopper;

    let logPost: LogPost = new LogPost();
    logPost.text = this.customLogStory;
    logPost.log = log;

    this.logPostService.save(logPost)
      .subscribe(response => {
        this.logPost = response;
        this.step++;
      });
  }

  customThankYouMessage: string = "";
  selectThankInviterMessage(message: string) {
    this.service.saveThankYouMessage({
      sender: this.shopper,
      receiver: this.inviter,
      message: message
    })
      .subscribe(response => this.step++);
  }

  submitCustomThankYouMessage() {
    this.service.saveThankYouMessage({
      sender: this.shopper,
      receiver: this.inviter,
      message: this.customThankYouMessage
    })
      .subscribe(response => this.step++);
  }

  showCustomThankYouMessage: boolean = false;
  customizeThankYouMessage() {
    this.showCustomThankYouMessage = true;
  }

  selectConnectionValue(shopperConnectionValue: ShopperConnectionValue) {

    this.shopperConnectionService.save({
      id: 0,
      requester: this.shopper,
      recipient: this.inviter,
      shopperConnectionValue,
    }).subscribe((response) => { this.step++ });
  }

  selectedBirthdayActivities: BirthdayActivity[] = [];
  birthdayActivities: BirthdayActivity[] = [];

  selectBirthdayActivity(event: any, birthdayActivity: BirthdayActivity) {
    console.log('event', event);
    event.target.disabled = true;
    this.logImageService.save({
      id: 0,
      url: birthdayActivity.imageUrl,
      logPost: this.logPost
    }).subscribe(response => {

      this.selectedBirthdayActivities.push(birthdayActivity);
      this.logPost.logImages.push(response);

      if (this.selectedBirthdayActivities.length === 3) {

        this.logPostService.save(this.logPost).subscribe(response => this.logPost = response);
        this.step++;
      }
    });


  }

  changeShopper() {
    if (this.acceptedTermsAndConditions === false) {
      this.shopper.acceptedTermsAndConditions = false
    } else {
      this.shopper.acceptedTermsAndConditions = true
    }
    // this.shopperService.save(this.shopper).subscribe(response => this.shopper = response);
  }

  async saveCredentials() {

    const { firstName, lastName, gender } = this.shopperDetailsForm.value;

    if (!this.shopperDetailsForm.valid || !firstName || !lastName || !gender) {
      if (!firstName) {
        this.firstName?.setErrors({ "required": true });
        this.firstName?.markAsTouched();
      }
      if (!lastName) {
        this.lastName?.setErrors({ "required": true });
        this.lastName?.markAsTouched();
      }
      if (!gender) {
        this.gender?.setErrors({ "required": true });
        this.gender?.markAsTouched();
      }
      return;
    }

    this.shopper.firstName = firstName;
    this.shopper.lastName = lastName;
    this.shopper.gender = gender;
    this.shopper.dob = this.birthDate;
    this.shopper.password = "password";

    await this.shopperService.save(this.shopper)
      .subscribe(response => {
        this.shopper = response;
        console.log('response', response);
      });

    this.walletService.acceptInvitation(this.shopper.id);
    this.nextStep();

  }

}
