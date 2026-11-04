#!/bin/bash
# Task 4, step 8: rate limit tests against a production build. Usage: rate-e2e.sh 13   or   rate-e2e.sh 14
BASE=http://localhost:3077
SP=/c/Users/USER/AppData/Local/Temp/claude/c--Users-USER-Desktop-CarePoint/89ec5ed9-2e9c-4a32-bda1-4f4577164a01/scratchpad
T="postgresql://postgres@localhost:5432/carepoint_t4_rate"
J='Content-Type: application/json'
cd /c/Users/USER/Desktop/CarePoint

stop() { pid=$(netstat -ano | grep -E ":3077 .*LISTEN" | head -1 | awk '{print $NF}'); [ -n "$pid" ] && taskkill //PID $pid //F >/dev/null 2>&1; sleep 2; }
start() { stop; (DATABASE_URL="$T" npx next start -p 3077 > /tmp/rate-server.log 2>&1 &); for i in $(seq 1 20); do curl -s -o /dev/null $BASE/ && break; sleep 2; done; }
code() { # path data [extra curl args]  -> status code only
  local p="$1" d="$2"; shift 2; curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE$p" -H "$J" "$@" -d "$d"; }
full() { # path data [extra curl args] -> status line, Retry-After, body
  local p="$1" d="$2"; shift 2
  curl -s -i -X POST "$BASE$p" -H "$J" "$@" -d "$d" | tr -d '\r' | awk 'NR==1{print "  " $0} tolower($0) ~ /^retry-after:/{print "  " $0} /^\{/{print "  " $0}'; }
login() { echo "{\"email\":\"$1\",\"password\":\"x\"}"; }

if [ "$1" = "13" ]; then
echo "# Run by Claude Code on the user's machine at the user's request, 2026-11-03. Production build, throwaway database (dropped afterwards). The server is restarted before each part, because the counters live in memory."
echo "# Script: evidence/13-rate-limit-script.sh. Limits: login 5 per email and 20 per address per 15 min; reset 3 per email and 10 per address per hour; register 10 per address per hour."
echo
start; echo "##### A. Login: 21 requests from ONE address, a different email each time (the address limit is 20 per 15 minutes)"
echo "\$ curl -X POST $BASE/api/login -d '{\"email\":\"userN@example.com\",\"password\":\"x\"}'   (N = 1 to 21)"
for i in $(seq 1 20); do printf "  request %2d -> %s\n" $i "$(code /api/login "$(login user$i@example.com)")"; done
echo "  request 21 ->"; full /api/login "$(login user21@example.com)"; echo
start; echo "##### B. Login: 6 requests for the SAME email from one address (the email limit is 5 per 15 minutes)"
for i in $(seq 1 5); do printf "  request %d -> %s\n" $i "$(code /api/login "$(login same@example.com)")"; done
echo "  request 6 ->"; full /api/login "$(login same@example.com)"
echo "  the same email in a different case, request 7 ->"; full /api/login "$(login SAME@Example.COM)"; echo
start; echo "##### C. Register: 11 requests from one address (the limit is 10 per hour). Bad bodies, so nothing is saved."
for i in $(seq 1 10); do printf "  request %2d -> %s\n" $i "$(code /api/register '{"name":"a"}')"; done
echo "  request 11 ->"; full /api/register '{"name":"a"}'
echo "  a perfectly VALID registration right after, still refused:"; full /api/register '{"name":"Valid Person","email":"valid@example.com","phone":"08000000001","password":"correct horse battery","termsAccepted":true}'
echo "  patients saved in the database: $(psql "$T" -tA -c 'select count(*) from "Patient";')"; echo
start; echo "##### D. Reset: 4 requests for the same email (the limit is 3 per hour)"
for i in 1 2 3; do printf "  request %d -> %s\n" $i "$(code /api/reset '{"email":"reset@example.com"}')"; done
echo "  request 4 ->"; full /api/reset '{"email":"reset@example.com"}'
echo "  reset: 11 DIFFERENT emails from one address (the address limit is 10 per hour), request 11 ->"
stop; start
for i in $(seq 1 10); do code /api/reset "{\"email\":\"r$i@example.com\"}" >/dev/null; done; full /api/reset '{"email":"r11@example.com"}'; echo
start; echo "##### E. The body size limit stops a huge body without Content-Length (sent in chunks) and one that declares a huge size"
head -c 300000 /dev/zero | tr '\0' 'x' > "$SP/chunk.bin"
echo "  300 KB sent chunked (no Content-Length):"; curl -s -i -X POST "$BASE/api/register" -H "$J" -H "Transfer-Encoding: chunked" --data-binary @"$(cygpath -w "$SP/chunk.bin")" | tr -d '\r' | awk 'NR==1{print "  " $0} /^\{/{print "  " $0}'
echo "  declares 300 KB:"; curl -s -i -X POST "$BASE/api/register" -H "$J" --data-binary @"$(cygpath -w "$SP/chunk.bin")" | tr -d '\r' | awk 'NR==1{print "  " $0} /^\{/{print "  " $0}'
stop
fi

if [ "$1" = "14" ]; then
echo "# Run by Claude Code on the user's machine at the user's request, 2026-11-03. Production build, throwaway database (dropped afterwards). The server is restarted before each part."
echo "# Script: evidence/14-rate-limit-script.sh. This file shows how the limits can be DEFEATED, and which part still holds."
echo "# Why this works: Next.js sets x-forwarded-for from the real connection only when the client did not send it (node_modules/next/dist/server/base-server.js:601, the ?\"??=\" line). On a direct connection a client can therefore choose its own address."
echo
start; echo "##### A. Defeating the ADDRESS limit: 50 login requests, each claiming a different address (X-Forwarded-For) and using a different email"
echo "\$ curl -X POST $BASE/api/login -H \"X-Forwarded-For: 10.0.0.N\" -d '{\"email\":\"userN@example.com\",\"password\":\"x\"}'   (N = 1 to 50)"
c429=0; for i in $(seq 1 50); do s=$(code /api/login "$(login user$i@example.com)" -H "X-Forwarded-For: 10.0.0.$i"); [ "$s" = "429" ] && c429=$((c429+1)); done
echo "  50 requests sent, $c429 of them refused with 429  (the same 50 from one real address would have stopped at the 21st)"; echo
start; echo "##### B. The EMAIL limit still holds: 6 requests for one email, each claiming a different address"
for i in $(seq 1 5); do printf "  request %d (claims 11.0.0.%d) -> %s\n" $i $i "$(code /api/login "$(login target@example.com)" -H "X-Forwarded-For: 11.0.0.$i")"; done
echo "  request 6 (claims 11.0.0.6) ->"; full /api/login "$(login target@example.com)" -H "X-Forwarded-For: 11.0.0.6"
echo "  a 7th request claiming yet another address ->"; full /api/login "$(login Target@Example.com)" -H "X-Forwarded-For: 11.0.0.7"; echo
start; echo "##### C. The shared-address effect: one person uses up an address, a second person on the same address is refused"
echo "  Person A (address 5.5.5.5) makes 20 login attempts for her own accounts:"
for i in $(seq 1 20); do code /api/login "$(login a$i@example.com)" -H "X-Forwarded-For: 5.5.5.5" >/dev/null; done
echo "  Person B, a different patient with a different email, same address 5.5.5.5, first attempt ->"; full /api/login "$(login b@example.com)" -H "X-Forwarded-For: 5.5.5.5"
echo "  Person B from his own address 6.6.6.6 ->"; full /api/login "$(login b@example.com)" -H "X-Forwarded-For: 6.6.6.6"
stop
fi
