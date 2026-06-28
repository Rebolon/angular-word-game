import { Component } from '@angular/core';

@Component({
  selector: 'my-title',
  standalone: true,
  template: `
    <div class="title-container">
      <h1 class="logo-text">WordStorm</h1>
      <p class="subtitle-text">Boggle & Alphabet Game</p>
    </div>
  `,
  styles: [`
    .title-container {
      margin: 1rem auto;
      text-align: center;
    }
    
    .logo-text {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin: 0;
      background: linear-gradient(135deg, #818cf8 0%, #f472b6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 2px 10px rgba(99, 102, 241, 0.25));
      text-transform: uppercase;
    }
    
    .subtitle-text {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-muted);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin: 0.2rem 0 0 0;
      opacity: 0.8;
    }
  `]
})
export class TitleComponent {
}
