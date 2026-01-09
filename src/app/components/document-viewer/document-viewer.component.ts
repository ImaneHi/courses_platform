import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-document-viewer',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './document-viewer.component.html',
  styleUrls: ['./document-viewer.component.scss']
})
export class DocumentViewerComponent {
  @Input() url!: SafeResourceUrl | string; // sanitized or raw
  @Input() rawUrl!: string; // raw string used for linking
  @Input() title?: string;

  constructor(
    private modalCtrl: ModalController,
    private sanitizer: DomSanitizer
  ) {}

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

  isImage(): boolean {
    if (!this.rawUrl) return false;
    const u = this.rawUrl.toLowerCase();
    return u.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) !== null;
  }

  isVideo(): boolean {
    if (!this.rawUrl) return false;
    const u = this.rawUrl.toLowerCase();
    return u.match(/\.(mp4|webm|ogg|mov|avi|wmv)$/i) !== null;
  }

  isOther(): boolean {
    return !this.isPdf() && !this.isPpt() && !this.isImage() && !this.isVideo();
  }

  get googleViewerUrl(): SafeResourceUrl {
    // Use Google Docs viewer for ppt/pptx and PDFs (works if publicly accessible)
    const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(this.rawUrl)}&embedded=true`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
  }
}
