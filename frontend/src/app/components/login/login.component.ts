import { Component, inject } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Auth } from '@angular/fire/auth';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: false,

  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage: string = '';
  constructor(private authService: AuthService, private router: Router) {}

  login() {
    // .subscribe((datos) => {
    this.authService.login(this.email, this.password).then(userCredential => {
      console.log('user autenticado:', userCredential);
    })
    .catch(error => {
      console.error('Error en login:', error);
      this.errorMessage = error.message;
    });
  }

  async loginWithGoogle() {

    this.authService.loginWithGoogle()

    .then((result) => {
      console.log(result.user);
      Swal.fire({
        icon: 'success',
        title: '¡Éxito!',
        text: 'Usuario autenticado correctamente',
      })
      result.user.getIdToken()
      .then((token) => {
          this.router.navigate(['/dashboard', token]);
      });
    })
    .catch((error) =>    {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Algo salió mal!',
      });
      console.error('Error en login:', error)})
  }
}
