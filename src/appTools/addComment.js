import { ElementSelection } from './elementSelection';
import { Comment } from './../comment';
import API from './../api';

export class AddComment extends ElementSelection {
  constructor(name, toolBtn, workspace) {
    super(name, toolBtn, workspace);
    console.log('Comment element tool enabled.');
    this.boundingBox;
    this.waitingForComment = false;
    this.cancelComment = this.cancelComment.bind(this);
    workspace.commentForm.cancelCreateBtn.onclick = this.cancelComment;
    if (workspace.permissions.length > 1) { // there is always at least the owner
      const membersEmails = [];
      workspace.permissions.forEach(member => {
        if (member.emailAddress !== 'ramoncarcelesroman@gmail.com') { // TODO: get the current with: window.getCurrentUser().emailAddress
          membersEmails.push(`<option value="${member.emailAddress}">${member.displayName}</option>`);
        }
      });
      workspace.commentForm.mentionsInput.innerHTML = membersEmails.join('');
      workspace.commentForm.showMentionsSection();
    } else {
      workspace.commentForm.hideMentionsSection();
    }
    this.addComment = this.addComment.bind(this);
    workspace.commentForm.addCommentBtn.onclick = this.addComment;
    // It could be disabled and or full if the previous use was view mode.
    workspace.commentForm.enableForm();
    workspace.commentForm.reset();
    // This could be a property of the Tool class.
    this.hasUsedPanel = false;
  }


  /**
   * Extends the method of the super class to get the selected element.
   * @param {MouseEvent} e The click event.
   */
  manageSelection(e) {
    if (!this.waitingForComment) {
      super.manageSelection(e);
      if (this.selection !== null) {
        console.log('Add comment to: ', this.selection);
        // Show the form to add the comment.
        this.workspace.commentForm.buttonsVisibilityMode('create');
        this.workspace.mainPanel.addSection('Comment', this.workspace.commentForm.formElement);
        this.workspace.mainPanel.open();
        this.hasUsedPanel = true;
        // TODO: Allow to change the commented element by picking another one.
        this.waitingForComment = true;
      }
    }
  }


  addComment() {
    // If 'activeDrawing' doesnt have a group for comments create it.
    if (this.workspace.activeDrawing.commentsGroup === undefined) {
      this.workspace.activeDrawing.createCommentsGroup();
    }
    // Mentions is only treated if there is more than one member in the team.
    let selectedEmails;
    if (this.workspace.permissions.length > 1) { // there is always at least the owner
      selectedEmails = this.workspace.commentForm.getSelectedMembers();
      if (selectedEmails.length > 0) {
        // TODO: window.getCurrentUser.displayName;
        // API.sendNotification(selectedEmails, 'Ramon' userInfo.displayName, userInfo.photoLink, this.workspace.commentForm.textInput.value, this.workspace.projectName, this.workspace.projectId);
      }
    }
    const comment = new Comment(this.selection.dataset.id, this.workspace.commentForm.textInput.value, selectedEmails);
    comment.createRepresentation(this.workspace.activeDrawing.commentsGroup, this.selection);
    // Add attribute to the commented element to indicate it has a comment.
    this.selection.dataset.comment = comment.id;
    this.workspace.comments.push(comment);
    console.log(this.workspace.comments);
    this.workspace.commentForm.reset();
    this.workspace.mainPanel.close();
    this.waitingForComment = false;
    // Workspace method to indicate that there are unsaved changes on comments.
    this.workspace.unsavedCommentsData();
    this.workspace.drawings.forEach(drawing => {
      if (drawing.id !== this.workspace.activeDrawing.id) {
        drawing.commentsChanged = true;
      }
    });
    super.clearSelection();
  }


  cancelComment() {
    this.workspace.mainPanel.close();
    this.workspace.commentForm.reset();
    this.waitingForComment = false;
    super.clearSelection();
  }


  kill() {
    super.kill();
    console.log('Comment element tool disabled.');
    if (this.waitingForComment) {
      this.workspace.commentForm.reset();
      this.workspace.mainPanel.close();
    }
    if (this.hasUsedPanel) {
      this.workspace.mainPanel.removeSection('Comment');
    }
    // Remove the tool event listeners.
    this.workspace.commentForm.addCommentBtn.onclick = null;
    this.workspace.commentForm.cancelCreateBtn.onclick = null;
  }
}