import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Enntra';
constructor(private router: Router){}

  ngOnInit(): void {
    this.router.navigate(['/']); // Redirige al componente que quieras
  }
 
}
