import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Datos } from 'src/app/datos';
import { DatosService } from 'src/app/datos.service';
import Swal from 'sweetalert2';

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




  transationData = {     "id": 8145455,
    "name": "Carlos Perez",
    "ticketNumber": "AB21d15B",
    "ticketName": "Concierto Shakira Occidental Alta",
    "user": "carlosp",
    "token": this.token}

  constructor(private datosService: DatosService, private route: ActivatedRoute) {}


  consultarEstado(){
    this.datosService.getDatos().subscribe((datos) => {
      this.datos = datos;
      console.log(datos); // Mostramos los datos en la consola
        Swal.fire({
      title: 'consulta!',
      text: ''+JSON.stringify(datos),
      icon: 'info',
      confirmButtonText: 'Aceptar'
    });
  });
  }



  venderBoleta(){
    let data = this.transationData
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
