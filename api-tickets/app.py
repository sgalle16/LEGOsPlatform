# app.py
from flask import Flask, request, jsonify

app = Flask(__name__)

# In-memory "database" with 2 example tickets
tickets = [
    {
        "ticket_id": "AB21d15B",
        "user_id": "8145455",
        "event": "Concert Shakira",
        "date": "2025-04-05"
    },
    {
        "ticket_id": "TICKET002",
        "user_id": "1000778922",
        "event": "Movie Premiere",
        "date": "2025-04-7"
    },
    {
        "ticket_id": "CD98E76F",
        "user_id": "1999778922",
        "event": "Festival Rock",
        "date": "2025-05-10"
    },
    {
        "ticket_id": "XY12Z34A",
        "user_id": "1777778922",
        "event": "Obra de Teatro",
        "date": "2025-06-15"
    },
    {
        "ticket_id": "AB21d15B",
        "user_id": "70702020",
        "event": "Concierto Maluma",
        "date": "2025-07-20"
    },
    {
        "ticket_id": "AAA123M25",
        "user_id": "12345678",
        "event": "Concierto fuerza rigida",
        "date": "2025-08-25"
    },
    {
        "ticket_id": "BBB123M25",
        "user_id": "987654321",
        "event": "Concierto fuerza rigida",
        "date": "2025-09-30"
    }
    
]


@app.route('/api/ticket', methods=['GET'])
def get_ticket_details():
    # Get query parameters
    id = request.args.get('id')
    ticket_id = request.args.get('ticket_id')

    print(
        f"Flask API: Received request for user_id={id}, ticket_id={ticket_id}")

    # Find ticket in our "database"
    ticket = next((t for t in tickets if t["ticket_id"] == ticket_id), None)

    # Case 1: Ticket not found
    if not ticket:
        print(f"Flask API: Ticket {ticket_id} not found.")
        return jsonify({
            "status": "error",
            "message": f"No ticket with ID {ticket_id} exists"
        }), 404

    # Case 2: Ticket exists but wrong owner
    if ticket["user_id"] != id:
        print(
            f"Flask API: Ticket {ticket_id} found, but owner mismatch (Expected: {ticket['user_id']}, Got: {id}).")
        return jsonify({
            "status": "error",
            "message": f"Ticket {ticket_id} exists but it's not yours"
        }), 403

    # Case 3: Success
    print(
        f"Flask API: Ticket {ticket_id} validated successfully for owner {id}.")
    return jsonify({
        "status": "success",
        "data": {
            "event": ticket["event"],
            "ticket_id": ticket["ticket_id"],
            "user_id": ticket["user_id"],
            "date": ticket["date"]
        }
    }), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)
