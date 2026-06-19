#!/bin/bash
# Diagnostico do hang do /dashboard.
# Dispara /dashboard com cookie de sessao valido e inspeciona o pool durante o load.
cd /tmp
echo "=== 1. Disparando /dashboard (max-time 18s) ==="
rm -f dash.html dash_result.txt
(curl -s -o dash.html -w 'DASH_HTTP=%{http_code} size=%{size_download} time=%{time_total}\n' \
  -b cj.txt https://avgestao.com.br/dashboard --max-time 18 > dash_result.txt 2>&1) &
CURL_PID=$!

sleep 4
echo
echo "=== 2. Pool DURANTE o load (4s apos disparar) ==="
docker exec gestor_postgres psql -U gestor -d gestor_local -c "
SELECT pid, usename, state, wait_event_type, wait_event,
       age(now(),state_change) AS since_change,
       left(query,130) AS q
FROM pg_stat_activity
WHERE datname='gestor_local'
  AND pid <> pg_backend_pid()
ORDER BY state_change"
echo
echo "=== 3. Contagem por estado ==="
docker exec gestor_postgres psql -U gestor -d gestor_local -c "
SELECT state, count(*) FROM pg_stat_activity
WHERE datname='gestor_local' AND pid <> pg_backend_pid()
GROUP BY state ORDER BY 2 DESC"

wait $CURL_PID
echo
echo "=== 4. Resultado do /dashboard ==="
cat dash_result.txt
echo
echo "=== 5. Primeiros 400 chars do HTML retornado ==="
head -c 400 dash.html
echo
echo
echo "=== 6. Tem skeleton (loading.tsx) no HTML? ==="
grep -c -iE 'shimmer|skeleton|animate-pulse' dash.html
echo "=== 7. Tem conteudo real (Dashboard / Bem-vindo)? ==="
grep -c -iE 'Bem-vindo|Modulos|Total Clientes' dash.html