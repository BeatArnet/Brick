import random
from quiz_data import get_quiz_data
import quiz_ui # Required for the test block's mocking

def trigger_quiz_event(current_score):
    """
    Triggers a quiz event: selects a random question, runs it, and updates the score.

    Args:
        current_score (int): The player's current score.

    Returns:
        int: The updated score after the quiz event.
    """
    questions = get_quiz_data()

    if not questions:
        print("Warning: No quiz questions loaded! Skipping quiz event.")
        return current_score

    selected_question = random.choice(questions)
    
    # Ensure the selected question has all necessary keys, especially 'correct_answer_index'
    # This is a defensive check. quiz_data.py should ideally ensure this.
    if 'title' not in selected_question or \
       'question' not in selected_question or \
       'answers' not in selected_question or \
       'correct_answer_index' not in selected_question:
        print(f"Warning: Selected question is malformed: {selected_question.get('title', 'Unknown Title')}. Skipping quiz event.")
        return current_score

    print("\nStarting quiz event...")
    is_correct = quiz_ui.run_quiz_question(selected_question)

    if is_correct:
        print("Answer was correct! +100 points.")
        current_score += 100
    else:
        print("Answer was incorrect. No points awarded.")
    
    return current_score

if __name__ == '__main__':
    # --- Test block for trigger_quiz_event ---

    # Mocking functions for quiz_ui.run_quiz_question
    def mock_run_quiz_question_correct(question_data):
        print(f"Mocking quiz for: {question_data['title']} - Simulating CORRECT Answer")
        # Simulate the parts of run_quiz_question that trigger_quiz_event expects:
        # 1. Displaying the question (simplified for mock)
        print(f"\n--- {question_data['title']} ---")
        print(f"\n{question_data['question']}")
        answer_labels = ['A', 'B', 'C']
        for i, answer in enumerate(question_data['answers']):
            if i < len(answer_labels): print(f"{answer_labels[i]}. {answer}")
            else: print(f"?. {answer}")
        # 2. Getting user input (skipped in mock, assumed correct)
        print(f"\nEnter your answer (A, B, C): {answer_labels[question_data['correct_answer_index']]}") # Simulate choosing correctly
        # 3. Feedback (simplified)
        print("\n--- Feedback ---")
        print(f"Your answer: {question_data['answers'][question_data['correct_answer_index']]} (Correct!)")
        # 4. "Press Enter" (skipped in mock)
        # print("\nPress Enter to continue...") # Not strictly needed for trigger_quiz_event logic
        return True

    def mock_run_quiz_question_incorrect(question_data):
        print(f"Mocking quiz for: {question_data['title']} - Simulating INCORRECT Answer")
        # Simulate parts of run_quiz_question
        print(f"\n--- {question_data['title']} ---")
        print(f"\n{question_data['question']}")
        answer_labels = ['A', 'B', 'C']
        for i, answer in enumerate(question_data['answers']):
            if i < len(answer_labels): print(f"{answer_labels[i]}. {answer}")
            else: print(f"?. {answer}")
        
        # Simulate choosing an incorrect answer
        incorrect_choice_index = (question_data['correct_answer_index'] + 1) % len(question_data['answers'])
        print(f"\nEnter your answer (A, B, C): {answer_labels[incorrect_choice_index]}") 

        print("\n--- Feedback ---")
        print(f"Your answer: {question_data['answers'][incorrect_choice_index]} (Incorrect)")
        print(f"Correct answer: {question_data['answers'][question_data['correct_answer_index']]}")
        # print("\nPress Enter to continue...")
        return False

    # Store the original run_quiz_question function
    original_run_quiz_question_func = quiz_ui.run_quiz_question

    print("--- Testing trigger_quiz_event ---")

    # Test 1: Correct answer scenario
    print("\n--- Test 1: Correct Answer Scenario ---")
    quiz_ui.run_quiz_question = mock_run_quiz_question_correct
    test_score_correct = 0
    print(f"Initial score: {test_score_correct}")
    updated_score_correct = trigger_quiz_event(test_score_correct)
    print(f"Score after 'correct' quiz: {updated_score_correct}")
    if updated_score_correct == 100:
        print("Test 1 PASSED")
    else:
        print(f"Test 1 FAILED (Expected 100, got {updated_score_correct})")

    # Restore original function
    quiz_ui.run_quiz_question = original_run_quiz_question_func 

    # Test 2: Incorrect answer scenario
    print("\n--- Test 2: Incorrect Answer Scenario ---")
    quiz_ui.run_quiz_question = mock_run_quiz_question_incorrect
    test_score_incorrect = 50 # Start with some score
    print(f"Initial score: {test_score_incorrect}")
    updated_score_incorrect = trigger_quiz_event(test_score_incorrect)
    print(f"Score after 'incorrect' quiz: {updated_score_incorrect}")
    if updated_score_incorrect == 50: # Score should not change
        print("Test 2 PASSED")
    else:
        print(f"Test 2 FAILED (Expected 50, got {updated_score_incorrect})")

    # Restore original function (important if more tests followed or for interactive use)
    quiz_ui.run_quiz_question = original_run_quiz_question_func

    # Test 3: No questions loaded scenario
    print("\n--- Test 3: No Questions Loaded Scenario ---")
    
    # Mock get_quiz_data to return an empty list
    original_get_quiz_data = get_quiz_data # Save original
    # Need to be able to modify what quiz_manager's get_quiz_data sees
    # This requires quiz_manager to import get_quiz_data in a way that can be mocked,
    # or to pass get_quiz_data as a dependency.
    # For simplicity, let's assume quiz_data.py might be empty or fail.
    # The current import `from quiz_data import get_quiz_data` makes it hard to mock
    # get_quiz_data directly for quiz_manager without also changing quiz_data.py.
    
    # A practical way to test this is to ensure 'Neuer_Arzttarif_Frage_Antwort_Spiel.xlsx' 
    # is temporarily unavailable or quiz_data.get_quiz_data() is modified to return [].
    # Since I can't modify external files or easily re-import, I'll simulate the effect
    # by temporarily making the questions list empty if possible, or note this limitation.
    
    # For now, this test relies on the actual quiz_data.py. If it loads questions,
    # this specific path won't be tested by this mock.
    # A more robust way would be to inject get_quiz_data as a dependency to trigger_quiz_event.
    
    # Let's try to directly mock the get_quiz_data imported by quiz_manager
    # This is tricky because of `from quiz_data import get_quiz_data`
    # We would need to mock it in the quiz_manager's namespace.
    import sys
    # If quiz_data is already imported, its functions are already bound.
    # A more advanced mocking library like unittest.mock would handle this better.
    
    # For this environment, I will describe the test.
    # To test the "no questions loaded" scenario:
    # 1. Ensure quiz_data.get_quiz_data() would return an empty list (e.g., by having no Excel file).
    # 2. Call trigger_quiz_event.
    # 3. Verify the score remains unchanged and a warning is printed.
    # This part is harder to automate perfectly here without changing quiz_data.py or using a mock library.
    # The code has the `if not questions:` check, so the logic is there.
    print("Test 3: 'No questions loaded' scenario relies on quiz_data.get_quiz_data() returning empty.")
    print("If questions are loaded from Excel, this path isn't fully tested by this script alone.")
    # Assuming we could make get_quiz_data return [] for a moment:
    # temp_score_no_q = 75
    # print(f"Initial score: {temp_score_no_q}")
    # updated_score_no_q = trigger_quiz_event(temp_score_no_q) # Assuming get_quiz_data returns []
    # print(f"Score after 'no questions' quiz: {updated_score_no_q}") # Should be 75
    # if updated_score_no_q == temp_score_no_q:
    # print("Test 3 conceptually PASSED (if no questions were loaded)")
    # else:
    # print("Test 3 conceptually FAILED")
    
    print("\n--- End of tests ---")
