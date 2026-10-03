#!/bin/bash
echo "====================================================================="
echo "   SISTEMA POS Y FACTURACIÓN FISCAL VENEZUELA (NODE.JS)"
echo "====================================================================="
echo ""

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js no está instalado. Instálalo desde https://nodejs.org/"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "[AVISO] Instalando dependencias con npm install..."
    npm install
fi

echo "Iniciando servidor Node.js en http://localhost:3000 ..."
(sleep 2 && (which xdg-open > /dev/null && xdg-open http://localhost:3000 || which open > /dev/null && open http://localhost:3000)) &

npm run dev
