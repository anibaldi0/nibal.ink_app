export interface ModeloInfo {
  glb_url: string;
  thumbnail_url: string;
}

export interface DecalInfo {
  textura_url: string;
  offset: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface TazaData {
  nombre: string | null;
  mensaje: string | null;
  modelo: ModeloInfo;
  decal: DecalInfo;
  compartido_por: string | null;
  creado_en: string;
}

export interface ShareResponse {
  share_url: string;
  share_token: string;
  expira_en: string | null;
}
