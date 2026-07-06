import os
import re

def clasificar_y_renombrar(ruta_carpeta):
    archivos = [f for f in os.listdir(ruta_carpeta) if os.path.isfile(os.path.join(ruta_carpeta, f))]
    
    foto_personaje = None
    nombre_artista = "artista"
    
    # 1. Identificar la foto principal y el nombre
    for f in archivos:
        match = re.search(r'^1-(.*?)-personaje', f.lower())
        if match:
            foto_personaje = f
            nombre_artista = match.group(1)
            break
            
    if not foto_personaje:
        print("Error: No se encontró la foto '1-[nombre]-personaje' para identificar a la persona.")
        return

    print(f"\n--- Procesando carpeta de: {nombre_artista.upper()} ---")

    # Filtramos la foto de personaje para no renombrarla
    fotos_a_procesar = [f for f in archivos if f != foto_personaje]
    
    fotos_actuacion = []
    fotos_personal = []
    
    # 2. Fase de Clasificación (Pregunta al usuario)
    print("\n[ FASE DE CLASIFICACIÓN ]")
    for f in fotos_a_procesar:
        print(f"\nArchivo actual: {f}")
        while True:
            tipo = input("¿Es foto personal (P) o de actuación (A)?: ").strip().lower()
            if tipo in ['p', 'a']:
                break
            print("Por favor, introduce 'P' para personal o 'A' para actuación.")
            
        if tipo == 'a':
            nombre_act = input("  -> Nombre de la actuación (ej: mirame): ").strip().replace(" ", "-").lower()
            if not nombre_act: 
                nombre_act = "actuacion"
            # Guardamos el original y cómo queremos que se llame la actuación
            fotos_actuacion.append({'original': f, 'nombre_act': nombre_act})
        else:
            fotos_personal.append(f)

    # 3. Fase de Renombrado (Aplica el orden correcto)
    print("\n[ APLICANDO NUEVOS NOMBRES ]")
    contador_global = 2
    
    # Primero procesamos las de actuación
    for item in fotos_actuacion:
        ext = os.path.splitext(item['original'])[1]
        nuevo_nombre = f"{contador_global}-{nombre_artista}-{item['nombre_act']}{ext}"
        os.rename(os.path.join(ruta_carpeta, item['original']), os.path.join(ruta_carpeta, nuevo_nombre))
        print(f"Renombrado: {item['original']}  ->  {nuevo_nombre}")
        contador_global += 1
        
    # Después procesamos las personales (book)
    contador_book = 1
    for f in fotos_personal:
        ext = os.path.splitext(f)[1]
        nuevo_nombre = f"{contador_global}-{nombre_artista}-foto-personal-{contador_book}{ext}"
        os.rename(os.path.join(ruta_carpeta, f), os.path.join(ruta_carpeta, nuevo_nombre))
        print(f"Renombrado: {f}  ->  {nuevo_nombre}")
        contador_global += 1
        contador_book += 1

    print("\n--- ¡Proceso completado con éxito! ---")

# --- EJECUCIÓN ---
ruta_de_tu_carpeta = "C:/tefiaenteatro/src/assets/images/elenco/martin-de-pablo" # <--- CAMBIA ESTO
clasificar_y_renombrar(ruta_de_tu_carpeta)