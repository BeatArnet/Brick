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
import quiz_manager
from quiz_ui import QuizPopup # NEW Import

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
PINK = (255, 192, 203) # New color for question bricks

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
# active_bricks_per_column = {} # No longer needed for column-based quiz
# cleared_quiz_columns = set() # No longer needed

# --- NEW Global State Variables for Quiz ---
quiz_active = False
current_quiz_popup = None
# column_for_current_quiz = -1 # No longer needed
brick_hit_count = 0 # New counter for brick hits
next_question_brick_target = 0 # Target for next question brick

# --- Global Variables for Speed Boost/Penalty ---
ball_speed_boost_active = False
boost_start_time = 0
original_ball_speed_x = 0
original_ball_speed_y = 0
# --- END Global Variables for Speed Boost/Penalty ---

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
    global paddle_x, ball_x, ball_y, ball_speed_x, ball_speed_y, bricks, score, current_paddle_color
    # global active_bricks_per_column, cleared_quiz_columns # No longer needed
    global quiz_active, current_quiz_popup # column_for_current_quiz removed
    global brick_hit_count, next_question_brick_target # NEW globals
    global ball_speed_boost_active, boost_start_time, original_ball_speed_x, original_ball_speed_y # Speed penalty globals

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
    # active_bricks_per_column.clear() # No longer needed
    # cleared_quiz_columns.clear() # No longer needed

    # Reset quiz state variables
    quiz_active = False
    current_quiz_popup = None
    # column_for_current_quiz = -1 # No longer needed
    
    brick_hit_count = 0 # Initialize brick hit counter
    next_question_brick_target = random.randint(6, 8) # Initial target for the first question brick
    created_brick_count = 0

    # Reset speed penalty variables
    ball_speed_boost_active = False
    boost_start_time = 0
    # original_ball_speed_x and original_ball_speed_y are set when penalty activates


    for row in range(BRICK_ROWS):
        row_color_default = BRICK_COLORS[row % len(BRICK_COLORS)] # Zyklische Farbauswahl pro Reihe
        for col in range(BRICKS_PER_ROW):
            created_brick_count += 1
            brick_rect = pygame.Rect(
                BRICK_START_X + col * (BRICK_WIDTH + BRICK_PADDING),
                BRICK_START_Y + row * (BRICK_HEIGHT + BRICK_PADDING),
                BRICK_WIDTH,
                BRICK_HEIGHT
            )
            brick_item = {'rect': brick_rect, 'color': row_color_default, 'visible': True}
            # Removed 'column_index': col as it's not directly used for quiz trigger anymore
            # active_bricks_per_column[col] = active_bricks_per_column.get(col, 0) + 1 # No longer needed

            if created_brick_count == next_question_brick_target:
                brick_item['is_question_brick'] = True
                brick_item['color'] = WHITE # Mark question brick with WHITE color
                next_question_brick_target += random.randint(6, 8)
                # print(f"Brick at row {row}, col {col} is a question brick. Next target: {next_question_brick_target}") # Original print
                print(f"INFO: Brick at ({row},{col}) designated as a question brick. Target ID: {created_brick_count}. Next target: {next_question_brick_target}")
            bricks.append(brick_item)

    # Punkte
    global score
    score = 0

# Spiel starten
start_game()

# Spielschleife
running = True
clock = pygame.time.Clock()
game_font = pygame.font.SysFont('Consolas', 30) # Besser lesbare Schriftart
question_mark_font = pygame.font.SysFont('Consolas', 20) # Font for question mark

while running:
    
    # Events verarbeiten
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        
        if quiz_active and current_quiz_popup:
            popup_action = current_quiz_popup.handle_event(event)
            if popup_action == "answer_selected":
                # Feedback display is managed by popup's update and draw methods
                pass 
        elif not quiz_active: # Only handle game events if quiz is not active
            if event.type == pygame.MOUSEMOTION:
                paddle_x = event.pos[0] - PADDLE_WIDTH // 2
            # Keyboard paddle control is handled by pygame.key.get_pressed() below for continuous movement

    # --- Game Logic (runs if quiz is not active) ---
    if not quiz_active:
        # boost_start_time is read, not assigned. paddle_x handled by key/mouse events. score is read for display.
        # Paddle-Steuerung (Tastatur)
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT]:
            paddle_x -= paddle_speed
        if keys[pygame.K_RIGHT]:
            paddle_x += paddle_speed

        # Paddle an Bildschirmgrenzen halten
        paddle_x = max(0, min(SCREEN_WIDTH - PADDLE_WIDTH, paddle_x))

        # --- Speed Boost/Penalty Duration Management ---
        # global ball_speed_boost_active, ball_speed_x, ball_speed_y, original_ball_speed_x, original_ball_speed_y, boost_start_time # Moved into the if block
        if ball_speed_boost_active:
            # global ball_speed_boost_active, ball_speed_x, ball_speed_y, original_ball_speed_x, original_ball_speed_y, boost_start_time # This is now covered by the line above
            current_time = pygame.time.get_ticks()
            if current_time - boost_start_time >= 10000: # 10 seconds
                # print("Speed penalty duration over. Resetting ball speed.") # Original print
                print(f"INFO: Speed boost ended. Restoring original speed to: ({original_ball_speed_x},{original_ball_speed_y})")
                ball_speed_x = original_ball_speed_x
                ball_speed_y = original_ball_speed_y
                ball_speed_boost_active = False
        # --- End Speed Boost/Penalty Duration Management ---

        # Ball bewegen
        ball_x += ball_speed_x
        ball_y += ball_speed_y

        # Kollision mit Wänden
        ball_collided_wall = False
        if ball_x - BALL_RADIUS <= 0 or ball_x + BALL_RADIUS >= SCREEN_WIDTH:
            ball_speed_x *= -1
            ball_x = max(BALL_RADIUS, min(SCREEN_WIDTH - BALL_RADIUS, ball_x)) 
            ball_collided_wall = True
        if ball_y - BALL_RADIUS <= 0:
            ball_speed_y *= -1
            ball_y = max(BALL_RADIUS, ball_y) 
            ball_collided_wall = True

        if ball_collided_wall and wall_hit_sound:
            wall_hit_sound.play()

        # Paddle und Ball Rechtecke für Kollision
        paddle_rect = pygame.Rect(paddle_x, paddle_y, PADDLE_WIDTH, PADDLE_HEIGHT)
        ball_rect = pygame.Rect(ball_x - BALL_RADIUS, ball_y - BALL_RADIUS, BALL_RADIUS * 2, BALL_RADIUS * 2)

        # Kollision mit Paddle
        if ball_rect.colliderect(paddle_rect) and ball_speed_y > 0: 
            ball_speed_y *= -1
            ball_y = paddle_y - BALL_RADIUS 

            offset = (ball_x - (paddle_x + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2) 
            ball_speed_x += offset * 2 
            ball_speed_x = max(-6, min(6, ball_speed_x))

            if paddle_hit_sound:
                paddle_hit_sound.play()
            current_paddle_color = random.choice([c for c in BRICK_COLORS if c != current_paddle_color])

        # Verloren
        if ball_y + BALL_RADIUS > SCREEN_HEIGHT:
            if game_over_sound:
                game_over_sound.play()
            pygame.time.wait(1000) 
            start_game() 

    # --- Shared Logic (Brick Collision and Quiz Triggering - runs even if quiz will become active this frame) ---
    # We need ball_rect for brick collision even if game is paused next frame.
    # If game is paused, ball_rect won't update, but we need its last position for this check.
    ball_rect = pygame.Rect(ball_x - BALL_RADIUS, ball_y - BALL_RADIUS, BALL_RADIUS * 2, BALL_RADIUS * 2) # Ensure ball_rect is current

    for brick_item in bricks[:]:
        if brick_item['visible'] and ball_rect.colliderect(brick_item['rect']):
            if not quiz_active: # Only process brick hit if quiz is not already active
                brick_item['visible'] = False
                score += 10
                brick_hit_count += 1 # Increment hit count

                # column_idx = brick_item['column_index'] # No longer needed
                # active_bricks_per_column[column_idx] -= 1 # No longer needed

                # REMOVED: Column cleared quiz trigger
                # if active_bricks_per_column[column_idx] == 0 and column_idx not in cleared_quiz_columns:
                #     print(f"Column {column_idx} cleared! Preparing quiz...")
                #     # ... (old column quiz logic removed)

                # NEW: Question brick quiz trigger
                if brick_item.get('is_question_brick'):
                    # print(f"Question brick hit! Current hit_count: {brick_hit_count}") # Original print
                    print(f"INFO: Question brick hit! Triggering quiz for brick at {brick_item['rect'].topleft}.")
                    question_data = quiz_manager.get_new_quiz_question()
                    if question_data:
                        current_quiz_popup = QuizPopup(screen, question_data)
                        quiz_active = True
                        # column_for_current_quiz = column_idx # No longer needed
                        # Pause game sounds/music here (if any)
                    else:
                        print("No more questions available or error. Skipping quiz.")
                        # cleared_quiz_columns.add(column_idx) # No longer needed
                    brick_item['is_question_brick'] = False # Avoid re-triggering

                ball_speed_y *= -1 # Ball rebounds
                if brick_hit_sound:
                    brick_hit_sound.play()
                break # Process one brick hit per frame

    # --- Quiz Popup Update Logic (runs if quiz is active) ---
    if quiz_active and current_quiz_popup:
        popup_status = current_quiz_popup.update()
        if popup_status == "feedback_finished":
            print("Quiz feedback finished.")
            selected_idx = current_quiz_popup.selected_answer_index
            q_data = current_quiz_popup.question_data

            score, was_correct = quiz_manager.check_answer_and_update_score(score, q_data, selected_idx)
            print(f"Score after quiz: {score}. Correct: {was_correct}")

            # --- Speed Penalty Logic ---
            # global ball_speed_boost_active, boost_start_time, original_ball_speed_x, original_ball_speed_y, ball_speed_x, ball_speed_y # Moved into the if block
            if not was_correct and not ball_speed_boost_active: # Apply penalty if answer was wrong and no boost is currently active
                # global ball_speed_boost_active, boost_start_time, original_ball_speed_x, original_ball_speed_y, ball_speed_x, ball_speed_y # This is now covered by the line above
                # print("Applying speed penalty for incorrect answer.") # Original print
                # Store original speeds *before* modification for the print statement
                temp_orig_x_for_print = ball_speed_x
                temp_orig_y_for_print = ball_speed_y
                original_ball_speed_x = ball_speed_x 
                original_ball_speed_y = ball_speed_y
                
                ball_speed_x *= 1.5
                ball_speed_y *= 1.5
                
                # Ensure speed doesn't become excessively high or zero if it was very low.
                # Cap the speed if necessary, e.g., max speed of 1.5 * 6 = 9
                max_abs_speed = 9 
                ball_speed_x = max(-max_abs_speed, min(max_abs_speed, ball_speed_x))
                ball_speed_y = max(-max_abs_speed, min(max_abs_speed, ball_speed_y))

                # If speeds were zero, applying 1.5x will keep them zero. Give a minimum boost.
                if original_ball_speed_x == 0 and original_ball_speed_y == 0:
                    # This case should ideally not happen if ball is moving, but as a fallback
                    ball_speed_x = random.choice([-3, 3]) * 1.5
                    ball_speed_y = -3 * 1.5
                elif original_ball_speed_x == 0: # If only x was zero
                    ball_speed_x = random.choice([-1, 1]) * 1.5 # Give some lateral movement
                elif original_ball_speed_y == 0: # If only y was zero (e.g. stuck horizontally)
                    ball_speed_y = (1 if ball_y < SCREEN_HEIGHT / 2 else -1) * 1.5 # Push towards center
                
                print(f"INFO: Incorrect answer. Applying 1.5x speed boost for 10s. Original speed: ({temp_orig_x_for_print},{temp_orig_y_for_print}), New speed: ({ball_speed_x},{ball_speed_y})")
                ball_speed_boost_active = True
                boost_start_time = pygame.time.get_ticks()
            # --- End Speed Penalty Logic ---

            # if column_for_current_quiz != -1: # No longer needed
            #     cleared_quiz_columns.add(column_for_current_quiz) # No longer needed
            #     print(f"Column {column_for_current_quiz} marked as quiz-cleared.") # No longer needed
            
            current_quiz_popup = None
            quiz_active = False
            # column_for_current_quiz = -1 # No longer needed
            # Resume game sounds/music here (if any)

    # --- Rendering ---
    # Hintergrund
    if background_image:
        screen.blit(background_image, (0, 0))
    else:
        screen.fill(BLACK) 

    # Bricks zeichnen
    for brick_item in bricks:
        if brick_item['visible']:
            pygame.draw.rect(screen, brick_item['color'], brick_item['rect'])
            pygame.draw.rect(screen, WHITE, brick_item['rect'], 1) # Border for all visible bricks

            if brick_item.get('is_question_brick'):
                question_text_surface = question_mark_font.render("?", True, BLACK)
                text_rect = question_text_surface.get_rect()
                text_rect.center = brick_item['rect'].center
                screen.blit(question_text_surface, text_rect.topleft)

    # Paddle zeichnen
    # Ensure paddle_rect is defined for drawing even if quiz is active (uses last position)
    paddle_rect_draw = pygame.Rect(paddle_x, paddle_y, PADDLE_WIDTH, PADDLE_HEIGHT)
    pygame.draw.rect(screen, current_paddle_color, paddle_rect_draw, border_radius=PADDLE_CORNER_RADIUS)
    pygame.draw.rect(screen, WHITE, paddle_rect_draw, 2, border_radius=PADDLE_CORNER_RADIUS) 

    # Ball zeichnen (uses last position if quiz is active)
    pygame.draw.circle(screen, BALL_COLOR, (int(ball_x), int(ball_y)), BALL_RADIUS)
    pygame.draw.circle(screen, WHITE, (int(ball_x), int(ball_y)), BALL_RADIUS, 1) 

    # Punkte anzeigen (always visible, or can be part of non-quiz UI)
    score_text = game_font.render(f"Score: {score}", True, WHITE)
    screen.blit(score_text, (10, 10))

    # If quiz is active, draw popup on top
    if quiz_active and current_quiz_popup:
        current_quiz_popup.draw()
    # "YOU WIN!" logic, only if quiz is not active
    elif not quiz_active and all(not brick['visible'] for brick in bricks) and bricks: 
        win_text = game_font.render("YOU WIN!", True, YELLOW)
        text_rect = win_text.get_rect(center=(SCREEN_WIDTH/2, SCREEN_HEIGHT/2 - 50))
        screen.blit(win_text, text_rect)
        restart_text = game_font.render("Press any key to restart", True, WHITE)
        restart_rect = restart_text.get_rect(center=(SCREEN_WIDTH/2, SCREEN_HEIGHT/2 + 0))
        screen.blit(restart_text, restart_rect)
        pygame.display.flip() 
        
        waiting_for_key = True
        while waiting_for_key:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                    waiting_for_key = False
                if event.type == pygame.KEYDOWN:
                    start_game()
                    waiting_for_key = False
            if not running: break 
            clock.tick(15) 

    # Aktualisieren
    pygame.display.flip()
    clock.tick(60) # 60 FPS

pygame.quit()