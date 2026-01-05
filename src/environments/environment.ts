// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
   firebase: {
    apiKey: "AIzaSyByUPH_Y8_ND2-uE0NEM6gSeaQ48fvUO3o",
    authDomain: "courses-platform-inl.firebaseapp.com",
    projectId: "courses-platform-inl",
    storageBucket: "courses-platform-inl.appspot.com",
    messagingSenderId: "214970099232",
    appId: "1:214970099232:web:e14e81277070a37099fe45"
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

// Optional API URL for backend integration. Leave empty to use in-memory/mock services.
export const apiConfig = {
  apiUrl: ''
};
