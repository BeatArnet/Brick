import pygame
import os # For checking font availability if needed

# It's good practice to initialize Pygame modules at the start of your program.
# pygame.init() will initialize all Pygame modules, including font.
# If Brick.py (or the main game file) already does this, it's not strictly necessary here.
# However, for standalone testing or modularity, it can be included.
# For this task, let's assume it's handled by the main game loop.
# If fonts fail to load, uncommenting pygame.font.init() might be necessary.
# pygame.font.init() 


# --- Color Definitions ---
POPUP_BG_COLOR = (230, 230, 230)  # Light gray
TEXT_COLOR = (10, 10, 10)        # Near black
ANSWER_BG_COLOR = (200, 200, 200)  # Medium gray
ANSWER_HOVER_COLOR = (160, 160, 160) # Darker gray for hover
CORRECT_HIGHLIGHT_COLOR = pygame.Color(60, 179, 113, 200)  # MediumSeaGreen with alpha
INCORRECT_HIGHLIGHT_COLOR = pygame.Color(255, 99, 71, 200) # Tomato with alpha
BORDER_COLOR = (80, 80, 80)       # Dark gray border

# --- Font Definitions ---
# It's good to check for font availability, or use a default
DEFAULT_FONT_STYLE = 'Arial' # A common default font
QUESTION_FONT_SIZE = 16
ANSWER_FONT_SIZE = 14
TITLE_FONT_SIZE = 30

# Helper to create fonts, trying preferred then falling back to default
def create_font(style, size):
    if pygame.font.get_init() and style.lower() in pygame.font.get_fonts():
        return pygame.font.SysFont(style, size)
    return pygame.font.SysFont(DEFAULT_FONT_STYLE, size)


class QuizPopup:
    def __init__(self, screen, question_data, font_style='Consolas'):
        # Ensure font module is initialized if not done globally
        if not pygame.font.get_init():
            pygame.font.init()

        self.screen = screen
        self.question_data = question_data
        # Ensure question_data has expected structure, provide defaults if not
        self.question_data.setdefault('title', 'Quiz Challenge!')
        self.question_data.setdefault('question', 'No question text provided.')
        self.question_data.setdefault('answers', ['Answer A', 'Answer B', 'Answer C'])
        self.question_data.setdefault('correct_answer_index', 0)


        self.font_style = font_style

        self.QUESTION_FONT = create_font(self.font_style, QUESTION_FONT_SIZE)
        self.ANSWER_FONT = create_font(self.font_style, ANSWER_FONT_SIZE)
        self.TITLE_FONT = create_font(self.font_style, TITLE_FONT_SIZE)
        
        s_width, s_height = self.screen.get_size()
        popup_width = int(s_width * 0.85) # Adjusted for potentially more text
        popup_height = int(s_height * 0.75) # Adjusted
        self.popup_rect = pygame.Rect(
            (s_width - popup_width) // 2,
            (s_height - popup_height) // 2,
            popup_width, popup_height
        )

        # Title
        self.title_surf = self.TITLE_FONT.render(self.question_data['title'], True, TEXT_COLOR)
        self.title_rect = self.title_surf.get_rect(centerx=self.popup_rect.centerx, top=self.popup_rect.top + 20)

        # Question (wrapped)
        # Max width for question text, allowing for padding inside the popup
        question_max_width = self.popup_rect.width - 60  # 30px padding on each side
        self.question_lines_surfs = self._render_wrapped_text(
            self.question_data['question'], 
            self.QUESTION_FONT, 
            question_max_width
        )

        # Answers
        self.answer_rects = []
        self.answer_surfs = []
        
        # Calculate available height and positioning for answers
        question_block_height = sum(surf.get_height() for surf in self.question_lines_surfs)
        
        # Y position for the first line of the question
        question_start_y = self.title_rect.bottom + 15 
        
        # Y position for the start of the answer block
        start_y_answers = question_start_y + question_block_height + 25 # Increased padding

        num_answers = len(self.question_data['answers'])
        ans_height = 45  # Base height for answer boxes
        ans_padding = 10 # Padding between answer boxes
        
        # Adjust ans_height if too many answers for available space
        bottom_padding_popup = 30 # Padding at the very bottom of the popup
        available_answer_space = self.popup_rect.bottom - start_y_answers - bottom_padding_popup
        
        if num_answers > 0:
            total_required_space = (ans_height * num_answers) + (ans_padding * (num_answers - 1))
            if total_required_space > available_answer_space:
                # Reduce height, ensuring it's reasonable
                ans_height = (available_answer_space - (ans_padding * (num_answers -1))) / num_answers
                ans_height = max(30, int(ans_height)) # Minimum height for an answer box

        answer_box_width = self.popup_rect.width - 100 # 50px padding on each side for answer boxes

        for i, answer_text in enumerate(self.question_data['answers']):
            ans_rect = pygame.Rect(
                self.popup_rect.left + 50, 
                start_y_answers + i * (ans_height + ans_padding),
                answer_box_width,
                ans_height
            )
            self.answer_rects.append(ans_rect)
            # Ensure answer text is a string before rendering
            ans_surf = self.ANSWER_FONT.render(str(answer_text), True, TEXT_COLOR)
            self.answer_surfs.append(ans_surf)

        self.selected_answer_index = None
        self.feedback_mode = False
        self.feedback_start_time = 0

    def _render_wrapped_text(self, text, font, max_width):
        lines_surfs = []
        text = str(text) # Ensure text is a string
        words = text.split(' ')
        current_line_text = ""
        
        if not words: # Handle empty text
             return [font.render("---", True, TEXT_COLOR)]

        for word in words:
            # Test if adding the new word (plus a space) exceeds max_width
            if current_line_text: # If line already has text, add a space before next word
                test_line = current_line_text + " " + word
            else:
                test_line = word
            
            if font.size(test_line)[0] <= max_width:
                current_line_text = test_line
            else:
                # Render the existing line (without the new word that was too long)
                if current_line_text: # Avoid rendering empty strings if a word itself is too long
                    lines_surfs.append(font.render(current_line_text, True, TEXT_COLOR))
                # Start new line with the current word
                current_line_text = word 
        
        # Add the last line
        if current_line_text:
            lines_surfs.append(font.render(current_line_text, True, TEXT_COLOR))
        
        # Fallback if text was empty or only spaces
        return lines_surfs if lines_surfs else [font.render("---", True, TEXT_COLOR)]


    def draw(self):
        # Popup background (main rectangle)
        pygame.draw.rect(self.screen, POPUP_BG_COLOR, self.popup_rect, border_radius=15)
        pygame.draw.rect(self.screen, BORDER_COLOR, self.popup_rect, 3, border_radius=15) # Border

        # Title
        self.screen.blit(self.title_surf, self.title_rect)

        # Question (wrapped text)
        line_y_offset = self.title_rect.bottom + 15 # Start Y for the first line of question
        for line_surf in self.question_lines_surfs:
            # Center each line of the question text
            line_rect = line_surf.get_rect(centerx=self.popup_rect.centerx, top=line_y_offset)
            self.screen.blit(line_surf, line_rect)
            line_y_offset += line_surf.get_height() # Move Y for the next line

        # Answers
        for i, ans_rect in enumerate(self.answer_rects):
            current_bg_color = ANSWER_BG_COLOR # Default answer background
            mouse_pos = pygame.mouse.get_pos()

            if not self.feedback_mode and ans_rect.collidepoint(mouse_pos):
                current_bg_color = ANSWER_HOVER_COLOR
            elif self.feedback_mode:
                is_correct_answer = (i == self.question_data['correct_answer_index'])
                is_selected_answer = (i == self.selected_answer_index)

                if is_selected_answer:
                    current_bg_color = CORRECT_HIGHLIGHT_COLOR if is_correct_answer else INCORRECT_HIGHLIGHT_COLOR
                elif is_correct_answer and self.selected_answer_index is not None and not (self.selected_answer_index == self.question_data['correct_answer_index']):
                    # Highlight the correct answer if user selected incorrectly and feedback is active
                    current_bg_color = CORRECT_HIGHLIGHT_COLOR
            
            # Draw answer background (handling alpha for highlight colors)
            # Pygame's draw.rect doesn't directly support alpha on the main surface unless the surface itself has per-pixel alpha.
            # So, for colors with alpha, we create a temporary surface.
            if isinstance(current_bg_color, pygame.Color) and current_bg_color.a < 255:
                temp_surf = pygame.Surface(ans_rect.size, pygame.SRCALPHA) # SRCPALPHA allows per-pixel alpha
                pygame.draw.rect(temp_surf, current_bg_color, temp_surf.get_rect(), border_radius=10)
                self.screen.blit(temp_surf, ans_rect.topleft)
            else:
                pygame.draw.rect(self.screen, current_bg_color, ans_rect, border_radius=10)
            
            # Draw border for answer box
            pygame.draw.rect(self.screen, BORDER_COLOR, ans_rect, 1, border_radius=10) 

            # Blit answer text
            ans_surf = self.answer_surfs[i]
            # Center the text inside the answer rectangle
            ans_text_rect = ans_surf.get_rect(center=ans_rect.center)
            self.screen.blit(ans_surf, ans_text_rect)
            
    def handle_event(self, event):
        if self.feedback_mode: # Do not process clicks if feedback is active
            return None

        if event.type == pygame.MOUSEBUTTONDOWN:
            if event.button == 1: # Left mouse button
                for i, ans_rect in enumerate(self.answer_rects):
                    if ans_rect.collidepoint(event.pos):
                        self.selected_answer_index = i
                        self.feedback_mode = True
                        self.feedback_start_time = pygame.time.get_ticks()
                        # print(f"Answer {i} selected. Feedback mode ON. Start time: {self.feedback_start_time}")
                        return "answer_selected"
        return None # No relevant action

    def update(self):
        if self.feedback_mode:
            current_time = pygame.time.get_ticks()
            if current_time - self.feedback_start_time >= 2000: # 2000 milliseconds = 2 seconds
                self.feedback_mode = False
                # self.selected_answer_index = None # Optional: reset selection, might be better to keep it for final review
                # print("Feedback finished. Popup should close or game continue.")
                return "feedback_finished"
            return "feedback_active" # Feedback is ongoing
        return None # Not in feedback mode

# The old console-based functions and if __name__ == '__main__' block
# have been removed as per instructions.
# For testing this QuizPopup, it would need to be integrated into a
# Pygame loop, like the one in Brick.py or a dedicated test script.
# Example (very basic, for standalone testing if needed, but Brick.py is the target):
# if __name__ == '__main__':
#     pygame.init()
#     screen_width = 800
#     screen_height = 600
#     screen = pygame.display.set_mode((screen_width, screen_height))
#     pygame.display.set_caption("Quiz Popup Test")

#     sample_question = {
#         'title': "Science Quiz",
#         'question': "What is the chemical symbol for water? This question is a bit longer to test text wrapping functionality and see how it behaves with more content.",
#         'answers': ["H2O", "O2", "CO2", "NaCl"],
#         'correct_answer_index': 0
#     }
#     sample_question_2 = {
#         'title': "History Challenge",
#         'question': "In which year did World War II end?",
#         'answers': ["1942", "1945", "1950", "1939"],
#         'correct_answer_index': 1
#     }
    
#     quiz_popup = QuizPopup(screen, sample_question, font_style='Arial') # Use a common font for testing

#     running = True
#     while running:
#         for event in pygame.event.get():
#             if event.type == pygame.QUIT:
#                 running = False
#             # Pass event to popup (though handle_event is currently a placeholder)
#             quiz_popup.handle_event(event) 
        
#         screen.fill((50, 50, 50))  # Dark background for the game screen
#         quiz_popup.draw()
#         pygame.display.flip()

#     pygame.quit()