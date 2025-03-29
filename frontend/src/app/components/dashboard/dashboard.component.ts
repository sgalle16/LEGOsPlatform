import { HttpClient } from '@angular/common/http';
import { Component, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Datos } from 'src/app/datos';
import { DatosService } from 'src/app/datos.service';
import Swal from 'sweetalert2';
declare var bootstrap: any;

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  datos: Datos[] = []; // Variable datos
  titulo: any; // Tipo para la variable titulo
  token = this.route.snapshot.paramMap.get('id');




  transationData: any;

  constructor(private datosService: DatosService, private route: ActivatedRoute) {}

  ngAfterViewInit(): void {
    const myCarousel = document.querySelector('#carouselExample');
    new bootstrap.Carousel(myCarousel, {
      interval: 2000, // Cambia la imagen cada 2 segundos
      ride: 'carousel'
    });
  }
  consultarEstado(){

   
    this.datosService.getDatos().subscribe((datos) => {
      this.datos = datos;
      console.log(datos); // Mostramos los datos en la consola
        Swal.fire({
      title: 'consulta!',
      text: ''+JSON.stringify(datos, null, 2),
      icon: 'info',
      confirmButtonText: 'Aceptar'
    });
  });
  }



  venderBoleta(condition: string){
    let data = this.transationData;
    switch (condition) {
      case 'maluma':
        data = {     "id": 70702020,
          "name": "Ana Mejia",
          "ticketNumber": "AB21d15B",
          "ticketName": "Concierto Maluma",
          "user": "anam",
          "token": this.token}
          console.log('Maluma ', this.token);
          
        break;
      case 'rigida':
        data = {     "id": 12345678,
          "name": "Santiago Gallego",
          "ticketNumber": "AAA123M25",
          "ticketName": "Concierto fuerza rigida",
          "user": "santiagog",
          "token": this.token}
          console.log('fuerza rigida ', this.token);
          
        break;
      default:
        data = {     
          "id": 987654321,
          "name": "Arturo Calle",
          "ticketNumber": "BBB123M25",
          "ticketName": "Concierto fuerza rigida",
          "user": "artur",
          "token": this.token}
          console.log('duki ', this.token);
    }
    
    this.datosService.createTicket(data).subscribe({
      next: (response) => {
        console.log('✅ Respuesta del servidor:',
          Swal.fire({
            title: 'Transacción enviada!',
            text: ''+JSON.stringify(response),
            icon: 'success',
            confirmButtonText: 'Aceptar'
          }),
          response);
      },
      error: (error) => {
        console.error('❌ Error en la solicitud:', error);
      },
      complete: () => {
        console.log('✔️ Proceso completado');
      }
  });

  }

}
