"""Build the rider support knowledge base for "Copilot Rides", a fictional robotaxi service.

Topics come from public robotaxi help centers, rider reviews and news coverage (see
`source` on each entry). Every answer and policy value is original and fictional:
nothing is copied from a real company. Output: web/src/rider/kb.json
"""
import json
from pathlib import Path

OUT = Path("web/src/rider/kb.json")

# Fictional policy values, kept in one place so answers stay consistent.
POLICY = {
    "service_name": "Copilot Rides",
    "service_area": "San Francisco",
    "hours": "24 hours a day, 7 days a week",
    "pickup_wait_minutes": 5,
    "free_cancel_minutes": 2,
    "cancel_fee": "$5",
    "cleaning_fee_minor": "$50",
    "cleaning_fee_major": "$150",
    "lost_item_hold_days": 30,
    "max_riders": 4,
    "min_age": 18,
}

H = "human"      # hand off to a human support agent
E = "emergency"  # urgent safety: tell rider what to do now and connect a human immediately
N = "none"

SRC_HELP = "Robotaxi help-center FAQs (topic)"
SRC_NEWS = "News coverage of rider incidents (topic)"
SRC_REVIEW = "Rider reviews and trip reports (topic)"
SRC_POLICY = "Published robotaxi rider rules (topic)"

# (id, category, question, alt phrasings, answer, escalation, uses_vehicle_context, source)
ENTRIES = [
    # Booking & availability
    ("book-01", "Booking", "How do I request a ride?", ["How do I book a car?", "How does this work?"],
     "Open the Copilot Rides app, set your pickup and destination, and tap Request. You'll see the fare and pickup time before you confirm, and the app shows the car's location as it approaches.", N, False, SRC_HELP),
    ("book-02", "Booking", "Where and when does the service operate?", ["What are your hours?", "Do you go to Oakland?"],
     "Copilot Rides operates within San Francisco, 24 hours a day, 7 days a week. The map in the app shows the exact service area; destinations outside it can't be booked yet.", N, False, SRC_HELP),
    ("book-03", "Booking", "Why can't I get a ride right now?", ["Service unavailable", "No cars available"],
     "Rides can be briefly unavailable when demand is high, or paused during heavy rain, fog or a city emergency. Try again in a few minutes; the app will show an estimated time when service resumes.", N, False, SRC_HELP),
    ("book-04", "Booking", "Can I schedule a ride in advance?", ["Can I book for tomorrow morning?"],
     "Not yet. Rides are requested on demand. For an important trip, like an airport run, request about 15 minutes before you need to leave.", N, False, SRC_REVIEW),
    ("book-05", "Booking", "Can I book a ride for someone else?", ["Can I send a car for my mom?"],
     "The account holder needs to be in the car for the whole trip, so you can't send a ride to someone riding alone. They can create their own account in a couple of minutes.", N, False, SRC_POLICY),
    ("book-06", "Booking", "How old do I have to be to ride?", ["Can my 16-year-old ride alone?", "Age requirement"],
     "Account holders must be 18 or older. Riders 13 to 17 can use a teen account set up by a parent or guardian; children under 13 must ride with an adult.", N, False, SRC_HELP),
    ("book-07", "Booking", "How many people can ride together?", ["Can I bring friends?", "How many seats?"],
     "Up to 4 riders, including you, as long as everyone has a seat and a seatbelt. Guests under 18 must ride with an adult.", N, False, SRC_POLICY),
    ("book-08", "Booking", "Can I go to or from the airport?", ["SFO pickup", "Do you serve the airport?"],
     "Airport trips are available to and from the designated rideshare zone. Follow the signs for app-based rides; the app will show the exact pickup spot and your car's number.", N, False, SRC_REVIEW),

    # Pickup
    ("pick-01", "Pickup", "How do I find my car?", ["Which car is mine?", "I can't find the vehicle"],
     "Check the car's ID and roof light color in the app; they match the car. You can also tap Honk or Flash lights to spot it. Once you're next to it, the app unlocks the doors.", N, True, SRC_HELP),
    ("pick-02", "Pickup", "Where is my car? It's late.", ["Why is my pickup taking so long?", "ETA keeps changing"],
     "Your car's live location and arrival time are in the app. Arrival times can shift with traffic or road closures. If it's running more than 10 minutes behind, you can cancel for free.", N, True, SRC_REVIEW),
    ("pick-03", "Pickup", "Why did the car stop somewhere other than my pin?", ["The car parked down the block", "Wrong pickup spot"],
     "The car picks the closest spot where it can stop safely and legally, which can be a short walk from your pin. Walking directions to the car are shown in the app.", N, True, SRC_HELP),
    ("pick-04", "Pickup", "How long will the car wait for me?", ["What if I'm running late?"],
     "The car waits up to 5 minutes after it arrives. After that the trip may be canceled and a $5 fee applied, since the car was held for you.", N, False, SRC_POLICY),
    ("pick-05", "Pickup", "The doors won't unlock.", ["I can't open the car", "Car is locked"],
     "Make sure you're right next to the car with the app open and Bluetooth on, then tap Unlock. If it still won't open, tap Help and a support agent can unlock it remotely.", H, True, SRC_HELP),
    ("pick-06", "Pickup", "Can I change my pickup location after booking?", ["I'm on the wrong corner"],
     "You can move your pickup pin a short distance in the app before the car arrives. For a bigger change, cancel and rebook; it's free within 2 minutes of requesting.", N, False, SRC_HELP),
    ("pick-07", "Pickup", "Someone else got into my car.", ["A stranger is in my ride"],
     "Don't get in. Tap Help so support can lock the car and speak to the person through the car's speakers. Your trip will be canceled at no charge and a new car sent if you want one.", H, True, SRC_REVIEW),
    ("pick-08", "Pickup", "How do I cancel a ride?", ["Cancel my trip"],
     "Tap your trip in the app and choose Cancel. It's free within 2 minutes of requesting or if your car is more than 10 minutes late; otherwise a $5 fee applies.", N, False, SRC_POLICY),

    # During the ride
    ("ride-01", "During the ride", "How do I start the ride?", ["The car isn't moving", "How do I get going?"],
     "Buckle up and tap Start on the screen in front of you or in the app. The car won't leave until every rider is buckled.", N, True, SRC_HELP),
    ("ride-02", "During the ride", "Can I change my destination during the ride?", ["Add a stop", "I want to go somewhere else"],
     "Yes. Update your destination in the app and the car reroutes; your fare updates to match the new trip. I can't change it from this chat.", N, True, SRC_HELP),
    ("ride-03", "During the ride", "How do I pull over or end the ride early?", ["Let me out here", "Stop the car"],
     "Tap Pull over on the screen or in the app. The car finds the next safe place to stop, usually within a block, and you're charged only for the distance traveled.", N, True, SRC_HELP),
    ("ride-04", "During the ride", "How do I control the music or temperature?", ["It's too cold", "Can I play my music?"],
     "Use the screen in front of you to adjust temperature, fan and music, or connect your phone through the app to play your own audio.", N, False, SRC_HELP),
    ("ride-05", "During the ride", "When will I arrive?", ["How much longer?", "What's my ETA?"],
     "Your current arrival time is on the screen and in the app. It updates live with traffic.", N, True, SRC_HELP),
    ("ride-06", "During the ride", "Why is the car taking this route?", ["This is the long way", "Why are we going in circles?"],
     "The car picks routes for safety and road conditions, which can differ from a navigation app's fastest path, for example avoiding a closure or a difficult turn. If the route seems wrong or the car is circling, tell me and I'll connect you with a support agent.", H, True, SRC_NEWS),
    ("ride-07", "During the ride", "Can you drive faster or take a different road?", ["Speed up", "Go down Market Street instead"],
     "I can't control how the car drives; the driving system decides speed and route for safety. You can change your destination in the app, and the car will reroute.", N, False, SRC_NEWS),
    ("ride-08", "During the ride", "Can I eat or drink in the car?", ["Is food allowed?"],
     "Covered drinks and small snacks are fine. Please take trash with you; messes that need extra cleaning can lead to a cleaning fee.", N, False, SRC_POLICY),
    ("ride-09", "During the ride", "Do I need to wear a seatbelt?", ["Can I unbuckle?"],
     "Yes, every rider must stay buckled for the whole trip. If someone unbuckles, the car may pull over until they buckle up again.", N, False, SRC_POLICY),
    ("ride-10", "During the ride", "How do I get out of the car?", ["How do I open the door?", "Door won't open"],
     "Wait until the car has fully stopped, check for bikes and traffic, then pull the door handle twice. Only exit on the curb side when you can.", N, False, SRC_HELP),

    # Stuck / delays / remote assistance
    ("stuck-01", "Stuck or delayed", "Why has the car stopped?", ["We're not moving", "Why are we stopped?"],
     "The car sometimes pauses for blocked lanes, emergency vehicles or construction. When it can't continue on its own, it automatically contacts a remote assistance specialist who helps it find a way forward. You're safe to stay seated with your belt on.", N, True, SRC_NEWS),
    ("stuck-02", "Stuck or delayed", "The car has been stuck for a long time. What do I do?", ["We've been stuck for 10 minutes", "This is taking forever"],
     "I'm sorry about the wait. I'm connecting you with a support agent now who can see your car and tell you what's happening. If you'd rather leave, tap Pull over or, when the car is fully stopped somewhere safe, you can exit; you won't be charged for this trip.", H, True, SRC_NEWS),
    ("stuck-03", "Stuck or delayed", "What is remote assistance?", ["Is someone driving the car?", "Who helps the car?"],
     "When the car faces something unusual, like a police officer directing traffic, it can ask a trained remote specialist for guidance. The specialist suggests a path and the car still does the driving. If needed, a roadside team can also come to the car.", N, False, SRC_NEWS),
    ("stuck-04", "Stuck or delayed", "Can the car be driven by someone remotely?", ["Can support take over?"],
     "Remote specialists can guide the car, for example confirming it's safe to go around an obstacle, but they don't steer it from a distance. If the car can't continue, we send a roadside team to help.", N, False, SRC_NEWS),
    ("stuck-05", "Stuck or delayed", "The car is going in circles.", ["It keeps looping", "We keep passing the same place"],
     "That shouldn't happen, and I'm sorry. I'm connecting you with a support agent right now who can stop the loop and get you moving. You won't be charged for this trip.", H, True, SRC_NEWS),
    ("stuck-06", "Stuck or delayed", "I'm going to miss my flight because of this delay.", ["I'll be late for work"],
     "I'm sorry, I know that's stressful. I'm connecting you with an agent who can check how quickly your car can get moving and help you decide whether to switch to another ride. Delays caused by the car are refunded.", H, True, SRC_NEWS),
    ("stuck-07", "Stuck or delayed", "The car dropped me off in the wrong place.", ["This isn't my destination", "Left me far away"],
     "I'm sorry. Tell me where you were trying to go and I'll connect you with support. If the car didn't reach your destination, we'll refund the trip and can send a new car to finish it.", H, True, SRC_NEWS),

    # Safety & emergencies
    ("safe-01", "Safety", "I'm having a medical emergency.", ["I feel faint", "Someone is hurt", "I can't breathe"],
     "Call 911 now if you can. Also tap the red Help button: an agent will answer right away, can call emergency services to your exact location, and can direct the car to stop somewhere safe.", E, True, SRC_HELP),
    ("safe-02", "Safety", "We were just in a collision.", ["The car crashed", "Someone hit us"],
     "Are you hurt? If anyone is injured, call 911. The car has already alerted our support team, and an agent will speak to you through the car. Stay inside with your seatbelt on unless there's smoke or fire, or the agent tells you it's safe to get out.", E, True, SRC_HELP),
    ("safe-03", "Safety", "I smell smoke or see fire.", ["The car is smoking"],
     "Get out as soon as the car is stopped and it's safe: pull the door handle twice, move well away from the car and traffic, and call 911. Tap Help so our team knows immediately.", E, True, SRC_POLICY),
    ("safe-04", "Safety", "I feel unsafe. Someone outside is threatening me.", ["Someone is following the car", "A person is banging on the window"],
     "Keep the doors closed; they stay locked while you're inside. Tap Help now: an agent will stay with you, can move the car away from the person, and can call police. Call 911 if you're in immediate danger.", E, True, SRC_REVIEW),
    ("safe-05", "Safety", "Another rider in the car is harassing me.", ["My guest is being aggressive"],
     "I'm sorry. Tap Help to reach an agent right away. They can pull the car over somewhere safe and contact police if needed. If you're in immediate danger, call 911.", E, True, SRC_POLICY),
    ("safe-06", "Safety", "Is it safe to ride without a driver?", ["Are these cars safe?", "I'm nervous"],
     "It's normal to feel nervous on your first ride. The car watches all around it at once and follows the speed limit, and a support agent is always one tap away. If you ever want to stop, tap Pull over.", N, False, SRC_HELP),
    ("safe-07", "Safety", "The car is driving erratically.", ["The car braked really hard", "It almost hit something"],
     "Thanks for telling me. If you feel unsafe right now, tap Pull over and the car will stop at the next safe spot. I'm also flagging this for our safety team and connecting you with an agent.", H, True, SRC_NEWS),
    ("safe-08", "Safety", "There's an emergency vehicle behind us.", ["Ambulance coming", "Police lights behind us"],
     "The car detects sirens and lights and will move over or stop to let emergency vehicles pass. You don't need to do anything.", N, False, SRC_NEWS),

    # Accessibility
    ("acc-01", "Accessibility", "Do you have wheelchair-accessible vehicles?", ["I use a wheelchair", "WAV"],
     "Yes, select the accessible van option when you book. Availability can be limited, so the app shows the wait time before you confirm. Standard cars can carry a folding wheelchair in the trunk.", N, False, SRC_POLICY),
    ("acc-02", "Accessibility", "Can I bring my service animal?", ["Guide dog", "Service dog"],
     "Yes. Service animals are always welcome at no extra charge. They should stay on the floor during the ride.", N, False, SRC_POLICY),
    ("acc-03", "Accessibility", "I'm blind or have low vision. How do I find the car?", ["Accessibility features for blind riders"],
     "The app works with your phone's screen reader and gives turn-by-turn walking directions to the car. Tap Honk to hear where it is, and the car plays an audio greeting when you open the door.", N, True, SRC_HELP),
    ("acc-04", "Accessibility", "I'm deaf or hard of hearing. How do I contact support?", ["Can I text support?"],
     "You can reach support by text chat in the app or on the car's screen at any time, including during an emergency. Important announcements also appear on the screen.", N, False, SRC_HELP),
    ("acc-05", "Accessibility", "Can I get help loading a mobility device?", ["I need help getting in"],
     "There's no driver on board to help with loading. If you need assistance, a companion can ride with you, or you can book the accessible van, which has a ramp. Tell me what you need and I can connect you with our accessibility team.", H, False, SRC_POLICY),
    ("acc-06", "Accessibility", "The accessible van didn't work for me.", ["The ramp didn't deploy"],
     "I'm really sorry. I'm connecting you with our accessibility team so they can make this right and refund the trip if needed.", H, True, SRC_POLICY),

    # Kids, guests, pets
    ("kid-01", "Kids, pets and belongings", "Can I ride with my child?", ["Do you have car seats?", "Booster seat"],
     "Yes, children can ride with an adult. Children who need a car seat or booster must use one, and you'll need to bring and install your own, since cars don't come with them.", N, False, SRC_HELP),
    ("kid-02", "Kids, pets and belongings", "Can I bring my pet?", ["Can my dog come?", "Cat in a carrier"],
     "Pets are welcome if they're in a closed carrier that stays on your lap or the floor. Service animals don't need a carrier.", N, False, SRC_POLICY),
    ("kid-03", "Kids, pets and belongings", "Can I bring a stroller or luggage?", ["Big suitcase", "Folding stroller"],
     "Yes. Strollers and luggage go in the trunk; the trunk opens from the app. Make sure everything fits so the doors and trunk can close.", N, False, SRC_HELP),
    ("kid-04", "Kids, pets and belongings", "Can my teenager ride alone?", ["Teen account"],
     "Riders 13 to 17 can ride alone with a teen account that a parent or guardian sets up and manages. Parents can see the trip live in their app.", N, False, SRC_HELP),
    ("rule-01", "Rules", "Can I bring alcohol or smoke in the car?", ["Can I vape?", "Open container"],
     "No. Smoking, vaping, and open alcohol aren't allowed in the car. Smoking or vaping can lead to a cleaning fee of up to $150.", N, False, SRC_POLICY),
    ("kid-06", "Kids, pets and belongings", "Can I bring my bike or scooter?", ["E-scooter in the trunk"],
     "Only if it folds and fits fully in the trunk. Full-size bikes and e-bikes can't be carried.", N, False, SRC_REVIEW),

    # Payments, pricing, refunds
    ("pay-01", "Payments", "How much does a ride cost?", ["What's the fare?", "Pricing"],
     "You see the full fare before you confirm. It's based on distance and expected time, and the price you confirm is what you pay unless you change the destination.", N, False, SRC_HELP),
    ("pay-02", "Payments", "Why was I charged more than the quoted fare?", ["Overcharged", "Fare is higher than expected"],
     "Fares change only if the destination was changed during the trip or a cleaning fee was added. If neither happened, I'll connect you with support to review and correct the charge.", H, False, SRC_REVIEW),
    ("pay-03", "Payments", "Should I tip?", ["Tipping"],
     "No tip needed. There's no driver, and the fare covers everything.", N, False, SRC_REVIEW),
    ("pay-04", "Payments", "How do I get a refund?", ["I want my money back", "Refund my trip"],
     "If the car didn't finish your trip, or had a long delay, we refund it automatically. For anything else, tell me what happened and I'll connect you with an agent who can review it; most reviews are done within 24 hours.", H, False, SRC_REVIEW),
    ("pay-05", "Payments", "Why was I charged a cleaning fee?", ["Cleaning fee", "Fee for mess"],
     "Cleaning fees apply when the car needs extra cleaning after a trip: $50 for things like spills or crumbs, up to $150 for smoking, vaping or serious messes. You'll get an email with details. If you think it's a mistake, I'll connect you with support to review the interior photos.", H, False, SRC_POLICY),
    ("pay-06", "Payments", "How do I add or change a payment method?", ["Update my card"],
     "Go to Account, then Payment in the app. I can't take card details in chat, so please don't share them here.", N, False, SRC_HELP),
    ("pay-07", "Payments", "Was I charged for a canceled ride?", ["Cancellation fee"],
     "Cancellations are free within 2 minutes of requesting, or if your car was more than 10 minutes late. Otherwise there's a $5 fee. If you were charged when you shouldn't have been, I can connect you with support.", N, False, SRC_POLICY),
    ("pay-08", "Payments", "Where can I get a receipt?", ["Receipt for expenses"],
     "Receipts are emailed after every trip and are always in Ride history in the app, where you can download a PDF.", N, False, SRC_HELP),

    # Lost items & cleanliness
    ("lost-01", "Lost items", "I left something in the car.", ["Lost my phone", "Forgot my bag"],
     "Report it in the app under Ride history, then select the trip and Lost item. We check the car's interior and hold found items for 30 days at our Mission Bay depot, where you can pick them up or arrange delivery.", H, False, SRC_HELP),
    ("lost-02", "Lost items", "I left my phone in the car and need it urgently.", ["Medication left in car"],
     "I'm connecting you with an agent now. For urgent items like a phone, keys or medication, we can sometimes hold the car or send it back to you shortly.", H, False, SRC_HELP),
    ("lost-03", "Lost items", "I found something someone else left.", ["Someone forgot a wallet"],
     "Thanks for telling us. Leave it on the seat and let me know what and where it is; we'll keep it safe for its owner.", N, False, SRC_HELP),
    ("lost-04", "Lost items", "The car is dirty.", ["Seat is wet", "Trash in the car"],
     "Sorry about that. You can report it in the app; we'll take the car out of service for cleaning. If it's too dirty to ride, tap Pull over or cancel before starting, and you won't be charged.", N, True, SRC_POLICY),
    ("lost-05", "Lost items", "Something in the car is broken.", ["Screen not working", "Seatbelt broken"],
     "Thanks for letting us know. If it's a seatbelt or door, please don't ride: cancel and we'll send another car at no charge. For anything else, report it in the app and we'll fix it after your trip.", H, True, SRC_POLICY),

    # Privacy
    ("priv-01", "Privacy", "Are there cameras in the car?", ["Am I being recorded?", "Is there video?"],
     "Yes, the car has interior cameras. Video is reviewed only for safety, incidents, cleanliness, lost items or rule violations, not routinely watched.", N, False, SRC_HELP),
    ("priv-02", "Privacy", "Does the car record audio?", ["Is it listening?"],
     "The car doesn't record cabin audio during normal rides. Audio is recorded only when you're talking with a support agent.", N, False, SRC_HELP),
    ("priv-03", "Privacy", "What do you do with my trip data?", ["Data privacy"],
     "Trip data is used to run the service, handle support and improve safety. You can see and download your data under Account, then Privacy in the app.", N, False, SRC_HELP),
    ("priv-04", "Privacy", "Can I delete my account?", ["Close my account"],
     "Yes, go to Account, then Privacy, then Delete account. If you have an open refund or claim, it's best to wait until it's resolved.", N, False, SRC_HELP),

    # Incidents & claims
    ("inc-01", "Incidents", "How do I report an incident or make a claim?", ["Insurance claim", "My car was damaged by your vehicle"],
     "I'm sorry this happened. I'll connect you with our incident team, who handle claims and information exchange. Please have the time, location and any photos ready.", H, False, SRC_HELP),
    ("inc-02", "Incidents", "I want to give feedback about a ride.", ["Complaint", "Feedback"],
     "Thanks, I'd like to hear it. You can rate the trip and leave comments in Ride history, or tell me here and I'll pass it to the team.", N, False, SRC_HELP),
    ("inc-03", "Incidents", "I want to talk to a human.", ["Real person please", "Agent"],
     "Of course. I'm connecting you with a support agent now.", H, False, SRC_REVIEW),
    ("inc-04", "Incidents", "Was I hurt in the collision? Should I see a doctor?", ["I feel sore after the crash"],
     "If you're in pain or think you might be hurt, please see a doctor. I can't give medical advice. I'm connecting you with our incident team so they can follow up with you.", H, False, SRC_HELP),

    # About the technology
    ("tech-01", "About the technology", "How does the car see the road?", ["How does it work?"],
     "The car uses lidar, radar and cameras to see 360 degrees around it, day and night, and software that predicts what other road users will do.", N, False, SRC_HELP),
    ("tech-02", "About the technology", "What happens if the car's system has a problem?", ["What if it breaks down?"],
     "The car constantly checks its own systems. If something isn't right, it pulls over safely, and support contacts you right away to arrange another ride.", N, False, SRC_HELP),
    ("tech-03", "About the technology", "Why does the car drive so cautiously?", ["It's so slow", "Too careful"],
     "The car is designed to follow speed limits and leave extra room around pedestrians, cyclists and other cars, which can feel careful compared with human drivers.", N, False, SRC_REVIEW),
    ("tech-04", "About the technology", "Does the car drive in bad weather?", ["Rain", "Fog"],
     "It drives in light rain and fog. In heavy rain or very low visibility, service may pause, and cars on a trip will finish it or pull over safely.", N, False, SRC_HELP),
]


def main() -> None:
    entries = [
        {"id": i, "category": c, "question": q, "alt_phrasings": alts, "answer": a,
         "escalation": esc, "uses_vehicle_context": ctx, "source": src}
        for i, c, q, alts, a, esc, ctx, src in ENTRIES
    ]
    ids = [e["id"] for e in entries]
    assert len(ids) == len(set(ids)), "duplicate ids"
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"policy": POLICY, "articles": entries}, indent=1))
    # Plain-text rendering injected into the copilot prompt (shared by the web route and the eval).
    lines = [f"[{e['id']}] ({e['category']}) Q: {e['question']} | Also asked as: {'; '.join(e['alt_phrasings'])}\n"
             f"A: {e['answer']}\nEscalation: {e['escalation']}" for e in entries]
    kb_text = "\n\n".join(lines) + "\n"
    (OUT.parent / "kb_prompt.md").write_text(kb_text)
    # One bundle that the web chat route and the eval both load, so they always run the same prompt.
    # Edit system_prompt.md, then re-run this script.
    template = (OUT.parent / "system_prompt.md").read_text()
    (OUT.parent / "prompt_bundle.json").write_text(json.dumps({"system_prompt": template.replace("{kb}", kb_text)}))
    by_cat = {}
    for e in entries:
        by_cat[e["category"]] = by_cat.get(e["category"], 0) + 1
    print(f"wrote {len(entries)} articles to {OUT}")
    print(by_cat)
    print({k: sum(e["escalation"] == k for e in entries) for k in (N, H, E)})


if __name__ == "__main__":
    main()
