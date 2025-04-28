import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {ObjectDetectionComponent} from './object-detection/object-detection.component';

@Component({
  selector: 'app-root',
  imports: [ObjectDetectionComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
}
