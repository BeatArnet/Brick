from quiz_data import get_quiz_data
import random

# This list will store questions. It's loaded once or as needed.
questions_data_cache = []
used_question_indices = set() # To avoid repeating questions in a session

def load_questions_if_needed():
    global questions_data_cache, used_question_indices
    if not questions_data_cache: # Only load if empty
        print("Loading quiz questions for the first time...")
        questions_data_cache = get_quiz_data()
        if not questions_data_cache:
            print("Warning: No quiz questions loaded from quiz_data.py!")
        else:
            print(f"Successfully loaded {len(questions_data_cache)} questions.")
            used_question_indices.clear() # Reset used questions if reloading

def get_new_quiz_question():
    '''
    Loads questions if necessary, selects an unused question, and returns its data.
    Returns None if no questions are available or all have been used.
    '''
    global questions_data_cache, used_question_indices
    # Make sure questions_data_cache is loaded before trying to use it for available_indices calculation for the print statement
    load_questions_if_needed() 
    available_indices_for_print = [i for i, q in enumerate(questions_data_cache) if i not in used_question_indices]
    print(f"INFO: Requesting new question. Used indices count: {len(used_question_indices)}. Available before selection: {len(available_indices_for_print)}")

    if not questions_data_cache:
        return None

    available_indices = [i for i, q in enumerate(questions_data_cache) if i not in used_question_indices]

    if not available_indices:
        # print("Warning: All quiz questions have been used. Resetting used questions list to allow repeats.") # Original print
        # This print should be right before used_question_indices.clear()
        print(f"INFO: All questions used. Resetting used_question_indices. Current used count: {len(used_question_indices)}. Total questions: {len(questions_data_cache)}")
        used_question_indices.clear() # Reset the set of used indices
        # Recalculate available_indices after clearing
        available_indices = [i for i, q in enumerate(questions_data_cache) if i not in used_question_indices] # Should now be all questions
        
        if not available_indices: # This would only happen if questions_data_cache itself is empty
            print("Error: No questions available in cache even after reset. Cannot select a question.")
            return None 

    selected_idx = random.choice(available_indices)
    used_question_indices.add(selected_idx)
    selected_question_title = questions_data_cache[selected_idx].get('title', 'N/A') # Get title for print
    print(f"INFO: Selected question index: {selected_idx}. Title: '{selected_question_title}'. Used indices count now: {len(used_question_indices)}")
    return questions_data_cache[selected_idx]

def check_answer_and_update_score(current_score, question_data, selected_answer_index):
    '''
    Checks if the selected answer is correct and updates the score.
    Args:
        current_score (int): The player's score before the quiz.
        question_data (dict): The data for the question that was asked.
        selected_answer_index (int): The index of the answer chosen by the player. Nullable if no answer.
    Returns:
        new_score (int): The score after the quiz.
        was_correct (bool): True if the answer was correct, False otherwise.
    '''
    if question_data is None or selected_answer_index is None: # Handle case where no answer was made or no question
        print("Quiz was skipped or no answer provided. No score change.")
        return current_score, False 

    correct_idx = question_data['correct_answer_index']
    was_correct = (selected_answer_index == correct_idx)

    if was_correct:
        new_score = current_score + 50 # Example: 50 points for a correct answer
        print(f"Answer was correct! Score +50. New score: {new_score}")
    else:
        new_score = current_score - 20 # Example: -20 points for an incorrect answer
        new_score = max(0, new_score) # Score shouldn't go below 0
        print(f"Answer was incorrect. Score -20. New score: {new_score}")
    
    return new_score, was_correct

# Any old trigger_quiz_event(score) function or similar is now removed.
# The new functions (get_new_quiz_question, check_answer_and_update_score) 
# will be orchestrated by the main game loop in Brick.py.
