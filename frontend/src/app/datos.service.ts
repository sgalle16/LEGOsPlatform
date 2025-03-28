 
// Importamos estos elementos 
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
 
// Importamos la interfaz 'datos'
import { Datos } from './datos'; 
 
@Injectable({
  providedIn: 'root'
})
export class DatosService {
 
  // URL de la API
  private url = 'http://localhost:3000';
 
  constructor(private http: HttpClient) { }
 
  getDatos(): Observable<Datos[]> {
 
    // Endpoint de la API
    return this.http.get<Datos[]>(`${this.url}/getTicket`);
 
  }


  createTicket(data: any): Observable<any> {
    return this.http.post(this.url+"/createTransation", data);
  }
  
}