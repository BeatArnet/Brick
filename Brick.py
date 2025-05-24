import pygame
import random
import os
import quiz_manager
from quiz_ui import QuizPopup

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

# Asset Pfade
ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets")
SOUNDS_DIR = os.path.join(ASSETS_DIR, "sounds")
IMAGES_DIR = os.path.join(ASSETS_DIR, "images")

# Bildschirm initialisieren
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Bricks Game")

# Lade Assets
try:
    background_image = pygame.image.load(os.path.join(IMAGES_DIR, "background.png")).convert()
    background_image = pygame.transform.scale(background_image, (SCREEN_WIDTH, SCREEN_HEIGHT))
except pygame.error as e:
    print(f"Fehler beim Laden des Hintergrundbildes: {e}. Nutze stattdessen eine schwarze Farbe.")
    background_image = None

try:
    brick_hit_sound = pygame.mixer.Sound(os.path.join(SOUNDS_DIR, "brick_hit.wav"))
    paddle_hit_sound = pygame.mixer.Sound(os.path.join(SOUNDS_DIR, "paddle_hit.wav"))
    wall_hit_sound = pygame.mixer.Sound(os.path.join(SOUNDS_DIR, "wall_hit.wav"))
    game_over_sound = pygame.mixer.Sound(os.path.join(SOUNDS_DIR, "game_over.wav"))
except pygame.error as e:
    print(f"Fehler beim Laden der Sounds: {e}. Sounds werden deaktiviert.")
    brick_hit_sound = paddle_hit_sound = wall_hit_sound = game_over_sound = None

# Globale Spielvariablen
paddle_x = 0
ball_x, ball_y = 0, 0
ball_speed_x, ball_speed_y = 0, 0
bricks = []
score = 0
current_paddle_color = BLUE
quiz_active = False
current_quiz_popup = None
brick_hit_count = 0
next_question_brick_target = 0
ball_speed_boost_active = False
boost_start_time = 0
original_ball_speed_x = 0
original_ball_speed_y = 0

# Paddle-Setup
PADDLE_WIDTH = 120
PADDLE_HEIGHT = 15
paddle_y = SCREEN_HEIGHT - 40
paddle_speed = 8
PADDLE_CORNER_RADIUS = 5

# Ball-Setup
BALL_RADIUS = 8
BALL_COLOR = YELLOW

# Bricks-Setup
BRICK_WIDTH = 70
BRICK_HEIGHT = 25
BRICK_PADDING = 5
BRICK_ROWS = 5
BRICKS_PER_ROW = SCREEN_WIDTH // (BRICK_WIDTH + BRICK_PADDING)
BRICK_START_X = (SCREEN_WIDTH - (BRICKS_PER_ROW * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING)) // 2
BRICK_START_Y = 50

# Fonts
game_font = pygame.font.SysFont('Consolas', 30)
question_mark_font = pygame.font.SysFont('Consolas', 20) # For the "?" on bricks

def start_game():
    global paddle_x, ball_x, ball_y, ball_speed_x, ball_speed_y, bricks, score, current_paddle_color
    global quiz_active, current_quiz_popup, brick_hit_count, next_question_brick_target
    global ball_speed_boost_active, boost_start_time, original_ball_speed_x, original_ball_speed_y

    paddle_x = (SCREEN_WIDTH - PADDLE_WIDTH) // 2
    current_paddle_color = BLUE
    ball_x = SCREEN_WIDTH // 2
    ball_y = SCREEN_HEIGHT // 2
    ball_speed_x = random.choice([-4, 4])
    ball_speed_y = -4
    bricks = []
    quiz_active = False
    current_quiz_popup = None
    brick_hit_count = 0
    next_question_brick_target = random.randint(6, 8)
    created_brick_count = 0
    ball_speed_boost_active = False
    score = 0

    for row in range(BRICK_ROWS):
        row_color = BRICK_COLORS[row % len(BRICK_COLORS)]
        for col in range(BRICKS_PER_ROW):
            created_brick_count += 1
            brick_rect = pygame.Rect(
                BRICK_START_X + col * (BRICK_WIDTH + BRICK_PADDING),
                BRICK_START_Y + row * (BRICK_HEIGHT + BRICK_PADDING),
                BRICK_WIDTH,
                BRICK_HEIGHT
            )
            brick_item = {'rect': brick_rect, 'color': row_color, 'visible': True}
            if created_brick_count == next_question_brick_target:
                brick_item['is_question_brick'] = True
                brick_item['color'] = WHITE
                next_question_brick_target += random.randint(6, 8)
                print(f"INFO: Brick at ({row},{col}) designated as a question brick. Target ID: {created_brick_count}. Next target: {next_question_brick_target}")
            bricks.append(brick_item)

start_game()
running = True
clock = pygame.time.Clock()

while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        
        if quiz_active and current_quiz_popup:
            current_quiz_popup.handle_event(event)
        elif not quiz_active:
            if event.type == pygame.MOUSEMOTION:
                paddle_x = event.pos[0] - PADDLE_WIDTH // 2

    if not quiz_active:
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT]:
            paddle_x -= paddle_speed
        if keys[pygame.K_RIGHT]:
            paddle_x += paddle_speed
        paddle_x = max(0, min(SCREEN_WIDTH - PADDLE_WIDTH, paddle_x))

        if ball_speed_boost_active:
            current_time = pygame.time.get_ticks()
            if current_time - boost_start_time >= 10000: # 10 seconds
                ball_speed_x = original_ball_speed_x
                ball_speed_y = original_ball_speed_y
                ball_speed_boost_active = False
                print(f"INFO: Speed boost ended. Restoring original speed to: ({original_ball_speed_x},{original_ball_speed_y})")

        ball_x += ball_speed_x
        ball_y += ball_speed_y

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

        paddle_rect = pygame.Rect(paddle_x, paddle_y, PADDLE_WIDTH, PADDLE_HEIGHT)
        ball_rect = pygame.Rect(ball_x - BALL_RADIUS, ball_y - BALL_RADIUS, BALL_RADIUS * 2, BALL_RADIUS * 2)

        if ball_rect.colliderect(paddle_rect) and ball_speed_y > 0: 
            ball_speed_y *= -1
            ball_y = paddle_y - BALL_RADIUS 
            offset = (ball_x - (paddle_x + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2) 
            ball_speed_x += offset * 2 
            ball_speed_x = max(-6, min(6, ball_speed_x))
            if paddle_hit_sound:
                paddle_hit_sound.play()
            current_paddle_color = random.choice([c for c in BRICK_COLORS if c != current_paddle_color])

        if ball_y + BALL_RADIUS > SCREEN_HEIGHT:
            if game_over_sound: game_over_sound.play()
            # pygame.time.wait(1000) # Commenting out wait to see if it helps with user's "rush" issue diagnosis
            start_game() 

    # Brick collision logic (can trigger quiz, so needs to be able to run parts even if quiz will become active)
    ball_rect_for_collision = pygame.Rect(ball_x - BALL_RADIUS, ball_y - BALL_RADIUS, BALL_RADIUS * 2, BALL_RADIUS * 2)
    for brick_item in bricks[:]:
        if brick_item['visible'] and ball_rect_for_collision.colliderect(brick_item['rect']):
            if not quiz_active: # Only process full brick hit logic if quiz is not already active
                brick_item['visible'] = False
                score += 10
                brick_hit_count += 1

                if brick_item.get('is_question_brick'):
                    print(f"INFO: Question brick hit! Triggering quiz for brick at {brick_item['rect'].topleft}.")
                    question_data = quiz_manager.get_new_quiz_question()
                    if question_data:
                        current_quiz_popup = QuizPopup(screen, question_data)
                        quiz_active = True
                    else:
                        print("No more questions available or error. Skipping quiz.")
                    brick_item['is_question_brick'] = False # Avoid re-triggering

                ball_speed_y *= -1 
                if brick_hit_sound:
                    brick_hit_sound.play()
                break 

    if quiz_active and current_quiz_popup:
        popup_status = current_quiz_popup.update()
        if popup_status == "feedback_finished":
            print("Quiz feedback finished.")
            selected_idx = current_quiz_popup.selected_answer_index
            q_data = current_quiz_popup.question_data
            score, was_correct = quiz_manager.check_answer_and_update_score(score, q_data, selected_idx)
            print(f"Score after quiz: {score}. Correct: {was_correct}")

            if not was_correct and not ball_speed_boost_active:
                temp_orig_x_for_print = ball_speed_x
                temp_orig_y_for_print = ball_speed_y
                original_ball_speed_x = ball_speed_x 
                original_ball_speed_y = ball_speed_y
                ball_speed_x *= 1.5
                ball_speed_y *= 1.5
                max_abs_speed = 9 
                ball_speed_x = max(-max_abs_speed, min(max_abs_speed, ball_speed_x))
                ball_speed_y = max(-max_abs_speed, min(max_abs_speed, ball_speed_y))
                if original_ball_speed_x == 0 and original_ball_speed_y == 0:
                    ball_speed_x = random.choice([-3, 3]) * 1.5
                    ball_speed_y = -3 * 1.5
                elif original_ball_speed_x == 0: ball_speed_x = random.choice([-1, 1]) * 1.5
                elif original_ball_speed_y == 0: ball_speed_y = (1 if ball_y < SCREEN_HEIGHT / 2 else -1) * 1.5
                print(f"INFO: Incorrect answer. Applying 1.5x speed boost for 10s. Original speed: ({temp_orig_x_for_print},{temp_orig_y_for_print}), New speed: ({ball_speed_x},{ball_speed_y})")
                ball_speed_boost_active = True
                boost_start_time = pygame.time.get_ticks()
            
            current_quiz_popup = None
            quiz_active = False
            # Add a small delay to prevent ball from immediately re-hitting the same spot if it was a question brick
            # This can happen if the ball is still overlapping the brick's area when quiz_active becomes false.
            # A more robust solution would be to move the ball slightly or ensure it cannot collide for a frame or two.
            # pygame.time.wait(100) # Commenting out wait to see if it helps with user's "rush" issue diagnosis
    
    # Rendering
    if background_image:
        screen.blit(background_image, (0, 0))
    else:
        screen.fill(BLACK) 

    for brick_item in bricks:
        if brick_item['visible']:
            pygame.draw.rect(screen, brick_item['color'], brick_item['rect'])
            pygame.draw.rect(screen, WHITE, brick_item['rect'], 1) 
            if brick_item.get('is_question_brick'): # Draw "?"
                question_text_surface = question_mark_font.render("?", True, BLACK)
                text_rect = question_text_surface.get_rect(center=brick_item['rect'].center)
                screen.blit(question_text_surface, text_rect)

    paddle_rect_draw = pygame.Rect(paddle_x, paddle_y, PADDLE_WIDTH, PADDLE_HEIGHT)
    pygame.draw.rect(screen, current_paddle_color, paddle_rect_draw, border_radius=PADDLE_CORNER_RADIUS)
    pygame.draw.rect(screen, WHITE, paddle_rect_draw, 2, border_radius=PADDLE_CORNER_RADIUS) 

    pygame.draw.circle(screen, BALL_COLOR, (int(ball_x), int(ball_y)), BALL_RADIUS)
    pygame.draw.circle(screen, WHITE, (int(ball_x), int(ball_y)), BALL_RADIUS, 1) 

    score_text = game_font.render(f"Score: {score}", True, WHITE)
    screen.blit(score_text, (10, 10))

    if quiz_active and current_quiz_popup:
        current_quiz_popup.draw()
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

    pygame.display.flip()
    clock.tick(60)

pygame.quit()