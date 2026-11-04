#!/bin/bash
# Task 4, step 9: the breach check on a production build, calling the real Have I Been Pwned service.
BASE=http://localhost:3077
J='Content-Type: application/json'
reg() { # label email password
  echo "--- $1"
  echo "\$ curl -i -X POST $BASE/api/register -d '{\"name\":\"Breach Test\",\"email\":\"$2\",\"phone\":\"08000000001\",\"password\":\"$3\",\"termsAccepted\":true}'"
  curl -s -i -w "\n  total time: %{time_total}s\n" -X POST "$BASE/api/register" -H "$J" -d "{\"name\":\"Breach Test\",\"email\":\"$2\",\"phone\":\"08000000001\",\"password\":\"$3\",\"termsAccepted\":true}" | tr -d '\r' | awk 'NR==1{print "  " $0} /^\{/{print "  " $0} /total time/{print}'
  echo
}
echo "##### A. Each password sent to POST /api/register (the details are otherwise valid)"
reg "A1 password123, in 2,266,543 known breaches (the guide's test)" a1@example.com "password123"
reg "A2 sixty-four letter p's, seen 10 times in breaches (my own Task 3 test password)" a2@example.com "pppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppp"
reg "A3 'correct horse battery', not in any breach" a3@example.com "correct horse battery"
reg "A4 a random strong password, not in any breach" a4@example.com "Q7-lamp-zeta-9Rk2-orbit"
echo "##### B. Time of a registration that passes (it includes the call to the breach service), 5 requests"
for i in 1 2 3 4 5; do curl -s -o /dev/null -w "  request $i status=%{http_code} time_s=%{time_total}\n" -X POST "$BASE/api/register" -H "$J" -d "{\"name\":\"Timing Test\",\"email\":\"timing$i@example.com\",\"phone\":\"08000000001\",\"password\":\"Zq9-timing-kite-$i-vault\",\"termsAccepted\":true}"; done
