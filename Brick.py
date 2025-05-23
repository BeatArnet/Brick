# - Spielschleife (`while running`):
#   - Event-Verarbeitung: Abfrage von Tastatur-, Maus- und Fensterereignissen.
#   - Spiellogik: Bewegung von Paddle und Ball, Kollisionserkennung.
#   - Rendering: Zeichnen aller Spielelemente auf den Bildschirm.
# - Kollisionslogik: Überprüft Kollisionen des Balls mit Wänden, Paddle und Bricks.
# - Soundwiedergabe: Spielt entsprechende Sounds bei Kollisionen ab.
#
# Benötigte Assets (im Unterordner 'assets'):
# - 'assets/sounds/brick_hit.wav' (oder .ogg)
# - 'assets/sounds/paddle_hit.wav' (oder .ogg)
# - 'assets/sounds/wall_hit.wav' (oder .ogg)
# - 'assets/images/background.png' (oder ein anderes Bild)
#
# Erstellt mit Pygame.
#-------------------------------------------------------------------------------

import pygame
import random
import os # Für plattformunabhängige Pfade
from quiz_manager import trigger_quiz_event # Importiere die Quiz-Manager-Funktion

# Initialisiere pygame und pygame.mixer
pygame.init()
pygame.mixer.init() # Wichtig für Sound

# Bildschirm-Grösse
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600

# Farben
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (220, 50, 50)
BLUE = (50, 100, 200)
GREEN = (50, 200, 100)
YELLOW = (255, 230, 0)
ORANGE = (255, 165, 0)
PURPLE = (128, 0, 128)
CYAN = (0, 255, 255)

BRICK_COLORS = [RED, ORANGE, YELLOW, GREEN, CYAN, BLUE, PURPLE]

# Asset Pfade (erstelle einen Ordner "assets" im selben Verzeichnis wie das Skript)
ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets")
SOUNDS_DIR = os.path.join(ASSETS_DIR, "sounds")
IMAGES_DIR = os.path.join(ASSETS_DIR, "images")
game_over_sound = ""

# Bildschirm initialisieren
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT)) # RESIZABLE entfernt für Einfachheit
pygame.display.set_caption("Bricks Game")

# Lade Assets
try:
    background_image = pygame.image.load(os.path.join(IMAGES_DIR, "background.png")).convert()
    background_image = pygame.transform.scale(background_image, (SCREEN_WIDTH, SCREEN_HEIGHT))
except pygame.error as e:
    print(f"Fehler beim Laden des Hintergrundbildes: {e}. Nutze stattdessen eine schwarze Farbe.")
    background_image = None # Fallback

try:
    brick_hit_sound = pygame.mixer.Sound(os.path.join(SOUNDS_DIR, "brick_hit.wav")) # z.B. ein kurzer "plop"
    paddle_hit_sound = pygame.mixer.Sound(os.path.join(SOUNDS_DIR, "paddle_hit.wav")) # z.B. ein "pong"
    wall_hit_sound = pygame.mixer.Sound(os.path.join(SOUNDS_DIR, "wall_hit.wav")) # z.B. ein dumpferes "thud"
    game_over_sound = pygame.mixer.Sound(os.path.join(SOUNDS_DIR, "game_over.wav")) # Optional
except pygame.error as e:
    print(f"Fehler beim Laden der Sounds: {e}. Sounds werden deaktiviert.")
    brick_hit_sound = paddle_hit_sound = wall_hit_sound = None


# Globale Spielvariablen (werden in start_game() initialisiert)
paddle_x = 0
ball_x, ball_y = 0, 0
ball_speed_x, ball_speed_y = 0, 0
bricks = []
score = 0
current_paddle_color = BLUE # Für eventuelle Farbwechsel
active_bricks_per_column = {} # <-- MODIFICATION: Track active bricks per column
cleared_quiz_columns = set() # <-- MODIFICATION: Track columns for which quiz has been triggered

# Paddle-Setup
PADDLE_WIDTH = 120 # Etwas breiter
PADDLE_HEIGHT = 15 # Etwas dicker
paddle_y = SCREEN_HEIGHT - 40 # Etwas höher für mehr Platz
paddle_speed = 8
PADDLE_CORNER_RADIUS = 5

# Ball-Setup
BALL_RADIUS = 8 # Statt BALL_SIZE
BALL_COLOR = YELLOW

# Bricks-Setup
BRICK_WIDTH = 70
BRICK_HEIGHT = 25
BRICK_PADDING = 5 # Abstand zwischen Bricks
BRICK_ROWS = 5
BRICKS_PER_ROW = SCREEN_WIDTH // (BRICK_WIDTH + BRICK_PADDING)
BRICK_START_X = (SCREEN_WIDTH - (BRICKS_PER_ROW * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING)) // 2
BRICK_START_Y = 50

# Funktion für ein neues Spiel
def start_game():
    global paddle_x, ball_x, ball_y, ball_speed_x, ball_speed_y, bricks, score, current_paddle_color, active_bricks_per_column, cleared_quiz_columns # <-- MODIFICATION: Added new globals

    # Paddle-Setup
    paddle_x = (SCREEN_WIDTH - PADDLE_WIDTH) // 2
    current_paddle_color = BLUE


    # Ball-Setup
    ball_x = SCREEN_WIDTH // 2
    ball_y = SCREEN_HEIGHT // 2
    ball_speed_x = random.choice([-4, 4]) # Startrichtung zufällig
    ball_speed_y = -4 # Immer nach oben starten

    # Bricks-Setup
    bricks = []
    active_bricks_per_column.clear() # <-- MODIFICATION: Clear for new game
    cleared_quiz_columns.clear() # <-- MODIFICATION: Clear for new game

    for row in range(BRICK_ROWS):
        row_color = BRICK_COLORS[row % len(BRICK_COLORS)] # Zyklische Farbauswahl pro Reihe
        for col in range(BRICKS_PER_ROW):
            brick_rect = pygame.Rect(
                BRICK_START_X + col * (BRICK_WIDTH + BRICK_PADDING),
                BRICK_START_Y + row * (BRICK_HEIGHT + BRICK_PADDING),
                BRICK_WIDTH,
                BRICK_HEIGHT
            )
            # <-- MODIFICATION: Store column index and initialize active_bricks_per_column count
            bricks.append({'rect': brick_rect, 'color': row_color, 'visible': True, 'column_index': col})
            active_bricks_per_column[col] = active_bricks_per_column.get(col, 0) + 1
            # END MODIFICATION

    # Punkte
    global score
    score = 0

# Spiel starten
start_game()

# Spielschleife
running = True
clock = pygame.time.Clock()
game_font = pygame.font.SysFont('Consolas', 30) # Besser lesbare Schriftart

while running:
    # Events verarbeiten
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        if event.type == pygame.MOUSEMOTION:
            # Paddle folgt der Maus nur, wenn die Maus im Fenster ist
            # (MOUSEMOTION Event feuert nur dann)
            paddle_x = event.pos[0] - PADDLE_WIDTH // 2

    # Paddle-Steuerung (Tastatur) - immer aktiv
    keys = pygame.key.get_pressed()
    if keys[pygame.K_LEFT]:
        paddle_x -= paddle_speed
    if keys[pygame.K_RIGHT]:
        paddle_x += paddle_speed

    # Paddle an Bildschirmgrenzen halten
    paddle_x = max(0, min(SCREEN_WIDTH - PADDLE_WIDTH, paddle_x))

    # Ball bewegen
    ball_x += ball_speed_x
    ball_y += ball_speed_y

    # Kollision mit Wänden
    ball_collided_wall = False
    if ball_x - BALL_RADIUS <= 0 or ball_x + BALL_RADIUS >= SCREEN_WIDTH:
        ball_speed_x *= -1
        ball_x = max(BALL_RADIUS, min(SCREEN_WIDTH - BALL_RADIUS, ball_x)) # Korrektur um Feststecken zu vermeiden
        ball_collided_wall = True
    if ball_y - BALL_RADIUS <= 0:
        ball_speed_y *= -1
        ball_y = max(BALL_RADIUS, ball_y) # Korrektur
        ball_collided_wall = True

    if ball_collided_wall and wall_hit_sound:
        wall_hit_sound.play()

    # Paddle und Ball Rechtecke für Kollision
    paddle_rect = pygame.Rect(paddle_x, paddle_y, PADDLE_WIDTH, PADDLE_HEIGHT)
    ball_rect = pygame.Rect(ball_x - BALL_RADIUS, ball_y - BALL_RADIUS, BALL_RADIUS * 2, BALL_RADIUS * 2)

    # Kollision mit Paddle
    if ball_rect.colliderect(paddle_rect) and ball_speed_y > 0: # Nur wenn Ball von oben kommt
        ball_speed_y *= -1
        ball_y = paddle_y - BALL_RADIUS # Position korrigieren, um Feststecken zu verhindern

        # Dynamischer Abprallwinkel
        # Mitte des Paddles: paddle_x + PADDLE_WIDTH / 2
        # Mitte des Balls: ball_x
        offset = (ball_x - (paddle_x + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2) # -1 (links) bis 1 (rechts)
        ball_speed_x += offset * 2 # Max. Änderung von -2 bis +2 auf x-Geschwindigkeit
        # Begrenze die maximale horizontale Geschwindigkeit, um das Spiel spielbar zu halten
        ball_speed_x = max(-6, min(6, ball_speed_x))

        if paddle_hit_sound:
            paddle_hit_sound.play()
        current_paddle_color = random.choice([c for c in BRICK_COLORS if c != current_paddle_color]) # Paddle Farbe ändern


    # Kollision mit Bricks
    for brick_item in bricks[:]: # Kopie der Liste für sicheres Entfernen
        if brick_item['visible'] and ball_rect.colliderect(brick_item['rect']):
            brick_item['visible'] = False # Brick "zerstören" (ausblenden statt entfernen für evtl. Effekte)
            
            score += 10 # Original score update
            
            # <-- MODIFICATION: Column clear detection and quiz trigger
            column_idx = brick_item['column_index']
            active_bricks_per_column[column_idx] -= 1

            if active_bricks_per_column[column_idx] == 0 and column_idx not in cleared_quiz_columns:
                print(f"Column {column_idx} cleared! Triggering quiz event.")
                # Call quiz event
                # Make sure screen is updated before quiz, so player sees the game state
                # This might require a screen update here if quiz_manager doesn't handle it.
                # For now, assume quiz_manager handles its own UI loop separately or prints to console.
                
                # Store current score to pass, then update with new score
                current_game_score = score 
                score = trigger_quiz_event(current_game_score) # Update global score
                
                cleared_quiz_columns.add(column_idx)
                print(f"Quiz event finished for column {column_idx}. New score: {score}")
            # END MODIFICATION

            # Ball Richtung ändern
            ball_speed_y *= -1 # Original ball direction change
            
            if brick_hit_sound:
                brick_hit_sound.play()
            break # Nur ein Brick pro Frame zerstören

    # Verloren
    if ball_y + BALL_RADIUS > SCREEN_HEIGHT:
        # Hier könnte man einen Game Over Sound spielen oder einen "Game Over" Bildschirm anzeigen
        if game_over_sound:
            game_over_sound.play()
        pygame.time.wait(1000) # Kurze Pause
        start_game() # Spiel neu starten

    # --- Rendering ---
    # Hintergrund
    if background_image:
        screen.blit(background_image, (0, 0))
    else:
        screen.fill(BLACK) # Fallback

    # Bricks zeichnen
    for brick_item in bricks:
        if brick_item['visible']:
            pygame.draw.rect(screen, brick_item['color'], brick_item['rect'])
            pygame.draw.rect(screen, WHITE, brick_item['rect'], 1) # Kleiner Rand für 3D-Effekt

    # Paddle zeichnen
    pygame.draw.rect(screen, current_paddle_color, paddle_rect, border_radius=PADDLE_CORNER_RADIUS)
    pygame.draw.rect(screen, WHITE, paddle_rect, 2, border_radius=PADDLE_CORNER_RADIUS) # Rand

    # Ball zeichnen
    pygame.draw.circle(screen, BALL_COLOR, (int(ball_x), int(ball_y)), BALL_RADIUS)
    pygame.draw.circle(screen, WHITE, (int(ball_x), int(ball_y)), BALL_RADIUS, 1) # Rand

    # Punkte anzeigen
    score_text = game_font.render(f"Score: {score}", True, WHITE)
    screen.blit(score_text, (10, 10))

    # Alle Bricks zerstört?
    if all(not brick['visible'] for brick in bricks) and bricks: # Prüfen ob bricks nicht leer ist
        # Hier könnte eine "You Win" Nachricht kommen
        win_text = game_font.render("YOU WIN!", True, YELLOW)
        text_rect = win_text.get_rect(center=(SCREEN_WIDTH/2, SCREEN_HEIGHT/2 - 50))
        screen.blit(win_text, text_rect)
        restart_text = game_font.render("Press any key to restart", True, WHITE)
        restart_rect = restart_text.get_rect(center=(SCREEN_WIDTH/2, SCREEN_HEIGHT/2 + 0))
        screen.blit(restart_text, restart_rect)
        pygame.display.flip() # Anzeige aktualisieren
        
        waiting_for_key = True
        while waiting_for_key:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                    waiting_for_key = False
                if event.type == pygame.KEYDOWN:
                    start_game()
                    waiting_for_key = False
            if not running: break # Aus äußerer Schleife ausbrechen, wenn Spiel beendet wurde
            clock.tick(15) # CPU nicht überlasten beim Warten


    # Aktualisieren
    pygame.display.flip()
    clock.tick(60) # 60 FPS

pygame.quit()