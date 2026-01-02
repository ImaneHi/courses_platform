import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-document-viewer',
  standalone: true,
  imports: [IonicModule, CommonModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="close()">Close</ion-button>
        </ion-buttons>
        <ion-title>{{ title || 'Document' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div *ngIf="isPdf()">
        <iframe [src]="url" width="100%" height="100%" style="min-height:60vh;border:none"></iframe>
      </div>

      <div *ngIf="isPpt()">
        <iframe [src]="googleViewerUrl" width="100%" height="100%" style="min-height:60vh;border:none"></iframe>
      </div>

      <div *ngIf="isOther()">
        <p>Cannot preview this document type. <a [href]="rawUrl" target="_blank">Open in new tab</a></p>
      </div>
    </ion-content>
  `
})
export class DocumentViewerComponent {
  @Input() url!: SafeResourceUrl | string; // sanitized or raw
  @Input() rawUrl!: string; // raw string used for linking
  @Input() title?: string;

  constructor(private modalCtrl: ModalController) {}

  close() {
    this.modalCtrl.dismiss();
  }

  isPdf(): boolean {
    return typeof this.rawUrl === 'string' && this.rawUrl.toLowerCase().endsWith('.pdf');
  }

  isPpt(): boolean {
    if (!this.rawUrl) return false;
    const u = this.rawUrl.toLowerCase();
    return u.endsWith('.ppt') || u.endsWith('.pptx');
  }

  isOther(): boolean {
    return !this.isPdf() && !this.isPpt();
  }

  get googleViewerUrl() {
    // Use Google Docs viewer for ppt/pptx (works if publicly accessible)
    return `https://docs.google.com/gview?url=${encodeURIComponent(this.rawUrl)}&embedded=true`;
  }
}
