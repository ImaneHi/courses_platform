import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { from, Observable, firstValueFrom } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  path: string;
  uploadedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class FileUploadService {

  private storage = inject(Storage);

  uploadFile(file: File, folder = 'courses'): Observable<UploadedFile> {
    const id = uuidv4();
    const path = `${folder}/${id}_${file.name}`;
    const storageRef = ref(this.storage, path);

    return from(uploadBytes(storageRef, file)).pipe(
      switchMap(snapshot =>
        from(getDownloadURL(snapshot.ref)).pipe(
          map(url => ({
            id,
            name: file.name,
            url,
            type: file.type,
            size: file.size,
            path,
            uploadedAt: new Date()
          }))
        )
      )
    );
  }

  uploadMultipleFiles(files: File[], folder = 'courses'): Observable<UploadedFile[]> {
    return from(this.uploadSequential(files, folder));
  }

  private async uploadSequential(files: File[], folder: string): Promise<UploadedFile[]> {
    const uploaded: UploadedFile[] = [];
    for (const file of files) {
      const f = await firstValueFrom(this.uploadFile(file, folder));
      uploaded.push(f);
    }
    return uploaded;
  }

  deleteFile(path: string) {
    return from(deleteObject(ref(this.storage, path)));
  }
}
