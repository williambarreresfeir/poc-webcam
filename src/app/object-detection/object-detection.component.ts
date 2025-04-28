import { Component, ElementRef, ViewChild } from '@angular/core';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs';
import * as cocossd from '@tensorflow-models/coco-ssd';

@Component({
  selector: 'app-object-detection',
  imports: [],
  templateUrl: './object-detection.component.html',
  styleUrl: './object-detection.component.scss'
})
export class ObjectDetectionComponent {
  @ViewChild('video', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  public isWebcamStarted = false;
  public predictions: cocossd.DetectedObject[] = [];

  private model: cocossd.ObjectDetection | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId?: number;

  constructor() { }

  async ngOnInit() {
    try {
      // Définir et initialiser le backend WebGL
      await tf.setBackend('webgl');
      console.log('Backend utilisé:', tf.getBackend());

      console.log('Chargement du modèle COCO-SSD...');
      this.model = await cocossd.load();
      console.log('Modèle chargé avec succès!');
    } catch (error) {
      console.error('Erreur lors du chargement du modèle:', error);
    }
  }

  ngOnDestroy() {
    this.stopWebcam();
  }

  async startWebcam() {
    if (this.isWebcamStarted) return;

    try {
      // Accéder à la webcam via l'API MediaDevices (HTML5)
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      const video = this.videoElement.nativeElement;
      video.srcObject = this.mediaStream;

      // Attendre que la vidéo soit chargée
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          resolve(true);
        };
      });

      // Configurer le canvas
      const canvas = this.canvasElement.nativeElement;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      this.isWebcamStarted = true;
      this.detectFrame();
    } catch (error) {
      console.error('Erreur lors de l\'accès à la webcam:', error);
    }
  }

  stopWebcam() {
    if (this.animationFrameId) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.srcObject = null;
    }

    this.isWebcamStarted = false;
    this.predictions = [];
  }

  async detectFrame() {
    if (!this.isWebcamStarted || !this.model) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    try {
      // Détecter les objets dans l'image
      this.predictions = await this.model.detect(video);

      // Effacer le canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dessiner l'image de la webcam sur le canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Dessiner les boîtes de détection
      this.predictions.forEach(prediction => {
        // Dessiner le rectangle
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 4;
        ctx.strokeRect(
          prediction.bbox[0],
          prediction.bbox[1],
          prediction.bbox[2],
          prediction.bbox[3]
        );

        // Dessiner le label
        ctx.fillStyle = '#00FFFF';
        ctx.font = '18px Arial';
        ctx.fillText(
          `${prediction.class} ${(prediction.score * 100).toFixed(2)}%`,
          prediction.bbox[0],
          prediction.bbox[1] > 10 ? prediction.bbox[1] - 5 : 10
        );
      });
    } catch (error) {
      console.error('Erreur lors de la détection:', error);
    }

    // Continuer la détection dans la prochaine frame
    this.animationFrameId = requestAnimationFrame(() => this.detectFrame());
  }
}
